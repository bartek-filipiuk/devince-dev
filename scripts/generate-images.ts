import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

if (!REPLICATE_API_TOKEN) {
  console.error('Error: REPLICATE_API_TOKEN is not set in .env')
  process.exit(1)
}

interface ImageSpec {
  filename: string
  prompt: string
}

const images: ImageSpec[] = [
  // Blog posts
  {
    filename: 'post-ai-developer-2025.webp',
    prompt:
      'A sleek modern developer workspace at night, ultrawide curved monitor displaying code with syntax highlighting and an AI chat interface, mechanical keyboard with subtle RGB backlighting, minimalist desk with a single plant, ambient blue and purple neon glow reflecting off the dark walls, photorealistic, cinematic lighting, 8k quality',
  },
  {
    filename: 'post-llm-automation.webp',
    prompt:
      'Abstract futuristic visualization of AI neural network and data flow, interconnected glowing nodes forming a complex web pattern, streams of light representing data transfer, deep purple and electric blue color palette with subtle pink accents, clean minimalist design, digital art style inspired by scientific visualization, dark background, 8k quality',
  },
  // Programs
  {
    filename: 'course-ai-product.webp',
    prompt:
      'Professional online learning environment for an AI course, modern laptop on a clean white desk showing code editor and machine learning diagrams, warm natural sunlight from large windows, potted plants and design books in background, cozy productive atmosphere, Scandinavian interior design aesthetic, photorealistic, 8k quality',
  },
  {
    filename: 'workshop-llm-integration.webp',
    prompt:
      'Modern tech workshop space with multiple developers collaborating, large screens showing Python code and API documentation, exposed brick walls and industrial lighting, standing desks and ergonomic chairs, diverse group focused on laptops, creative startup atmosphere, natural and artificial lighting mix, photorealistic, 8k quality',
  },
  {
    filename: 'event-ai-meetup.webp',
    prompt:
      'Evening tech meetup event in a trendy urban venue, diverse group of young professionals networking with drinks, warm ambient string lights and modern industrial interior, presentation screen visible in background, relaxed professional atmosphere, people engaged in conversation, photorealistic, candid documentary style, 8k quality',
  },
]

// Google Imagen 4 model
const IMAGEN_4_VERSION = 'ae454a84a2ae1e1d91a66c1d4cd012c0c799ed7dfd3a47e48dcd8833d73bb4e1'

async function generateImage(spec: ImageSpec): Promise<void> {
  const outputPath = path.join(process.cwd(), 'public/media/seed', spec.filename)

  // Always regenerate (remove skip logic for fresh generation)
  if (fs.existsSync(outputPath)) {
    console.log(`Removing old: ${spec.filename}`)
    fs.unlinkSync(outputPath)
  }

  console.log(`Generating: ${spec.filename}...`)
  console.log(`  Model: Google Imagen 4`)

  // Create prediction with Google Imagen 4
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: IMAGEN_4_VERSION,
      input: {
        prompt: spec.prompt,
        aspect_ratio: '16:9',
        output_format: 'png',
        safety_filter_level: 'block_only_high',
      },
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create prediction: ${error}`)
  }

  const prediction = (await createResponse.json()) as { id: string; status: string }
  console.log(`  Prediction created: ${prediction.id}`)

  // Poll for completion
  let result = prediction
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      },
    })

    result = (await statusResponse.json()) as {
      id: string
      status: string
      output?: string | string[]
      error?: string
    }
    process.stdout.write('.')
  }

  console.log('')

  if (result.status === 'failed') {
    throw new Error(`Prediction failed: ${(result as { error?: string }).error}`)
  }

  const output = (result as { output?: string | string[] }).output
  if (!output) {
    throw new Error('No output from prediction')
  }

  // Imagen 4 returns a single URL string, not an array
  const imageUrl = Array.isArray(output) ? output[0] : output
  console.log(`  Downloading from: ${imageUrl}`)

  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`)
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

  // Save as webp (converting filename)
  fs.writeFileSync(outputPath, imageBuffer)

  console.log(`  Saved: ${outputPath} (${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`)
}

async function main() {
  console.log('=== Generating AI Images with Google Imagen 4 ===\n')

  for (const spec of images) {
    try {
      await generateImage(spec)
    } catch (error) {
      console.error(`Error generating ${spec.filename}:`, error)
    }
  }

  console.log('\n=== Done ===')
}

main()
