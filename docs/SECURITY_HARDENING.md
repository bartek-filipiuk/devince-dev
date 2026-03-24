# Security Hardening: Coolify Panel — Tailscale + Port Lockdown

> Audyt przeprowadzony 2026-03-24. Coolify v4.0.0-beta.462 na serwerze Hetzner AX41 (65.109.60.26).

## Wyniki audytu

### Status: OK
- Coolify **v4.0.0-beta.462** — wszystkie 11 znanych CVE (CVSS 9.4-10.0) jest załatanych (patch w beta.445/beta.451)
- SSH: key-only authentication, brak password auth
- UFW aktywne z default deny incoming
- HTTPS/TLS via Let's Encrypt (auto-renewal)

### Do naprawy
- **Port 8000** (panel Coolify) — dostępny z całego internetu
- **Port 6001** (Coolify realtime) — dostępny z internetu
- **`cool.qaci.pl`** na porcie 443 via Traefik — drugie wejście do panelu, otwarte
- Docker omija UFW (własne reguły iptables DNAT)
- Brak CrowdSec/Fail2Ban

### CVE Reference
Coolify miał 11 krytycznych CVE (sty 2026) umożliwiających RCE jako root:
- CVE-2025-64419 (CVSS 9.7) — Command Injection via Docker Compose
- CVE-2025-64420 (CVSS 10.0) — SSH Key Exposure
- CVE-2025-64424 (CVSS 9.4) — Command Injection in Git Source
- CVE-2025-66209-66213 (CVSS 10.0) — Multiple authenticated RCE via database ops, proxy config
- Wszystkie załatane w v4.0.0-beta.451+

---

## Plan implementacji

### Krok 1: Zainstalować Tailscale na serwerze

```bash
ssh hetzner-ax41-1
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

- Zalogować się via URL w przeglądarce
- Zanotować Tailscale IP serwera (100.x.y.z)
- Sprawdzić: `tailscale status`, `ip addr show tailscale0`
- Zainstalować Tailscale na lokalnej maszynie jeśli nie ma

### Krok 2: Zablokować port 8000 z internetu (DOCKER-USER chain)

Docker omija UFW, więc filtrujemy w chain `DOCKER-USER`. Kolejność reguł: ACCEPT przed DROP.

```bash
# Zezwól na Tailscale (100.64.0.0/10 — CGNAT range)
sudo iptables -I DOCKER-USER -p tcp -m conntrack --ctorigdstport 8000 -s 100.64.0.0/10 -j ACCEPT
# Zezwól na localhost (wewnętrzne health checki)
sudo iptables -I DOCKER-USER -p tcp -m conntrack --ctorigdstport 8000 -s 127.0.0.0/8 -j ACCEPT
# Zablokuj resztę
sudo iptables -A DOCKER-USER -p tcp -m conntrack --ctorigdstport 8000 -j DROP

# Zamknij porty Coolify realtime
sudo iptables -A DOCKER-USER -p tcp -m conntrack --ctorigdstport 6001 -j DROP
sudo iptables -A DOCKER-USER -p tcp -m conntrack --ctorigdstport 6002 -j DROP
```

Usunąć mylącą regułę UFW:
```bash
sudo ufw delete allow 8000/tcp
```

### Krok 3: IP whitelist w Traefik dla `cool.qaci.pl`

Panel dostępny też przez Traefik na 443. Plik: `/data/coolify/proxy/dynamic/coolify-ui.yaml`

```yaml
http:
  routers:
    coolify-ui:
      rule: "Host(`cool.qaci.pl`)"
      entryPoints:
        - https
      middlewares:
        - coolify-tailscale-only
      service: coolify-ui
      tls:
        certResolver: letsencrypt
    coolify-ui-http:
      rule: "Host(`cool.qaci.pl`)"
      entryPoints:
        - http
      middlewares:
        - coolify-ui-redirect
      service: coolify-ui
  services:
    coolify-ui:
      loadBalancer:
        servers:
          - url: "http://coolify:8080"
  middlewares:
    coolify-tailscale-only:
      ipAllowList:
        sourceRange:
          - "100.64.0.0/10"
        ipStrategy:
          depth: 0
    coolify-ui-redirect:
      redirectScheme:
        scheme: https
        permanent: true
```

Traefik automatycznie przeładuje konfigurację (`--providers.file.watch=true`).

### Krok 4: Naprawić GitHub Actions deploy

Po whiteliście `cool.qaci.pl` GitHub Actions nie dotrze do API. Rozwiązanie: `tailscale/github-action`.

Dodać do `.github/workflows/deploy.yml`:
```yaml
- name: Setup Tailscale
  uses: tailscale/github-action@v3
  with:
    oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
    oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
    tags: tag:ci
```

Wymagane:
1. Utworzenie OAuth client w Tailscale Admin Console (Settings > OAuth clients)
2. Dodanie tagów ACL: `"tag:ci": ["autogroup:admin"]`
3. Dodanie `TS_OAUTH_CLIENT_ID` i `TS_OAUTH_SECRET` jako GitHub secrets
4. Opcjonalnie zmienić `COOLIFY_URL` na Tailscale IP serwera

### Krok 5: Utrwalić reguły iptables

```bash
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

---

## Weryfikacja

| Test | Komenda | Oczekiwany wynik |
|------|---------|-----------------|
| Panel via Tailscale | `curl -w '%{http_code}' http://<tailscale-ip>:8000/` | `302` |
| Panel z internetu (8000) | `curl --max-time 5 -w '%{http_code}' http://65.109.60.26:8000/` | `000` |
| Panel z internetu (443) | `curl --max-time 5 -w '%{http_code}' https://cool.qaci.pl/` | `403` |
| Port 6001 z internetu | `curl --max-time 5 -w '%{http_code}' http://65.109.60.26:6001/` | `000` |
| devince.dev | `curl -w '%{http_code}' https://devince.dev/` | `200` |
| SSH | `ssh hetzner-ax41-1 "echo OK"` | `OK` |
| GitHub Actions | Push test commit | Deploy przechodzi |

## Na przyszłość

- **CrowdSec** z bouncerem Traefik — IDS/IPS z community blocklist
- **Fail2Ban** na SSH — brute-force protection
- Automatyczna rotacja tokenów API
- Monitoring i alerty (np. Uptime Kuma)
