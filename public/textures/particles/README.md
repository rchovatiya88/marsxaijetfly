# Particle Textures for JetBick FPS Game

This directory contains the SVG textures for the sprite-particles component in the ReactFPS game.

## Available Textures

- **blob.svg**: A simple circular blob texture with soft edges, used for thruster effects, impacts, and general particles
- **explosion.svg**: A 5x5 spritesheet (500×500px) for explosion animations
- **fog.svg**: A cloud-like texture for fog and smoke effects
- **raindrop.svg**: A teardrop shape for rain and water effects

## Using SVG vs PNG

The game is currently configured to use SVG textures which work well with the particle system. However, if you need PNG versions for performance reasons or compatibility:

1. Open the `convert-svg-to-png.html` file in a web browser
2. Use the converter to generate PNG versions of each texture
3. Save the PNG files in this directory
4. Update the `sprite-particles-component.ts` file to reference the PNG files instead of SVG files

## PNG Texture Recommendations

If converting to PNG, use these recommended dimensions:

- blob.png: 128×128px
- explosion.png: 1024×1024px (5×5 grid, each cell being 204.8×204.8px)
- fog.png: 256×256px
- raindrop.png: 128×128px

## Customizing Textures

These particle textures are white with transparency, allowing the particle system to color them as needed. If you want to create custom textures:

1. Design white textures with appropriate alpha channels
2. Keep them relatively simple for better performance
3. For explosion frames, maintain the 5×5 grid layout
4. Save as SVG for scalability or PNG for compatibility

## Troubleshooting

If particles appear as squares or don't display correctly:
- Ensure the textures are properly loaded
- Check browser console for any errors
- Verify the path references in sprite-particles-component.ts
- Try using PNG versions if SVG doesn't render properly
