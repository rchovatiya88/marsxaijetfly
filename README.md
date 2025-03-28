# FPS Claude - A-Frame FPS Game in React

A first-person shooter game built with React and A-Frame. This project demonstrates how to integrate A-Frame's WebVR/WebXR capabilities with React for a modern web-based game development approach.

## Features

- First-person shooter gameplay
- Enemy AI with different enemy types
- Weapon mechanics with shooting, reloading
- Level progression system
- Score tracking and health management
- Physics-based movement and collisions
- Particle effects for visual feedback

## Technology Stack

- React.js for UI management
- A-Frame for WebVR/WebXR and 3D rendering
- Three.js for 3D graphics (used by A-Frame internally)
- YUKA for AI and entity management

## Installation

1. Make sure you have Node.js and npm installed
2. Clone this repository
3. Install dependencies:

```bash
cd marsxai
npm install
```

## Running the Game

Start the development server:

```bash
npm start
```

The game will open in your browser at http://localhost:3000.

## Controls

- **WASD**: Movement
- **Mouse**: Look around
- **Left Click**: Shoot
- **Shift**: Sprint
- **R**: Reload weapon
- **ESC**: Pause game

## Game Mechanics

### Enemies

The game features four types of enemies:
- **Normal**: Balanced stats
- **Fast**: Quick movement but lower health
- **Tank**: High health but slow movement
- **Sniper**: High damage and range but slow fire rate

### Levels

Each level increases the number and difficulty of enemies. Complete a level by defeating all enemies to progress to the next level.

## Development

### Project Structure

- `/public`: Static assets and HTML template
- `/src`: React source code
  - `/components`: A-Frame component definitions
    - `utils.js`: Utility functions and particle system
    - `hitbox-component.js`: Collision detection for entities
    - `player-component.js`: Player movement and physics
    - `weapon-component.js`: Weapon mechanics and shooting
    - `enemy-component.js`: Enemy AI and behavior
    - `game-manager.js`: Game state and level management
  - `App.js`: Main React component with A-Frame scene
  - `index.js`: React entry point

## Customization

You can modify the game parameters by adjusting the component properties in `App.js`:

- Change player stats in the `player-component` attributes
- Adjust weapon properties in the `weapon-component` attributes
- Modify game difficulty in the `game-manager` attributes

## License

This project is open source and available under the MIT License.
