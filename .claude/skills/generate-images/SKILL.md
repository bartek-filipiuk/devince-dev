---
name: generate-images
description: Generates AI images for lead design specs using Replicate API. Activates when design_spec.json has image_prompts but images are not yet generated.
---

# Generate Images Skill

This skill generates AI images for lead websites using the Replicate API.

## When to Activate

Activate this skill when ALL of the following are true:
1. Working with a lead folder in `outputs/<lead-name>/`
2. `design_spec.json` exists and contains `image_prompts` array
3. The `images/` folder doesn't exist OR is missing expected images
4. `image_paths` field is missing or incomplete in design_spec.json

## How to Execute

Run the image generation script:

```bash
python scripts/generate_images.py outputs/<lead-name>
```

Example:
```bash
python scripts/generate_images.py outputs/marso-mechanika
```

## What the Script Does

1. Reads `design_spec.json` from the lead folder
2. For each `image_prompt`:
   - Calls Replicate API with `openai/gpt-image-1.5` model
   - Generates at 3:2 aspect ratio (model limitation)
   - Center-crops to target ratio (16:9, 4:3, or 1:1)
   - Saves to `<lead>/images/<section>.png`
3. Updates `design_spec.json` with `image_paths`
4. Reports success/failure for each image

## Prerequisites

Before running, ensure:
- `REPLICATE_API_TOKEN` is set in `.env` file
- Python packages installed: `pip install replicate Pillow python-dotenv requests`

## Output

After successful run:
```
outputs/<lead-name>/
├── design_spec.json      # Updated with image_paths
└── images/
    ├── hero.png          # 16:9 cropped
    ├── services.png      # 4:3 cropped
    └── about.png         # 4:3 cropped
```

## Error Handling

- Each image generation retries once on failure
- Failed images are skipped, others continue
- Results summary shown at the end
