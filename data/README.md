# RealEyes Image Data

This directory holds the image assets for the RealEyes game.

## Directory Structure

```
data/
├── real/        ← Place real (AI-unmodified) images here
├── fake/        ← Place AI-generated or manipulated images here
└── manifest.json (auto-generated metadata)
```

## Supported Formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`

## Getting Images

1. Download a dataset of real vs AI-generated images (e.g., from Kaggle)
2. Sort them into `real/` and `fake/` directories
3. Restart the server — it will automatically detect and use them

## Minimum Requirements

- At least 8 images in `real/`
- At least 8 images in `fake/`
- For best experience, aim for 50+ images in each directory
