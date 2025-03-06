# World History Explorer

## Overview

World History Explorer is an interactive web game that allows players to click anywhere on a world map and explore historical events from the beginning of recorded history to the present day. When a location is clicked, a timeline slider appears, enabling players to slide through different historical periods and see what was happening in that region at any given time.

## Features

- Interactive Map: Click anywhere on the world map to select a region.
- Historical Timeline: A timeline slider appears upon clicking, allowing users to navigate through different historical eras.
- Rich Historical Data: Displays major events, civilizations, and significant occurrences in the selected region.
- Dynamic UI: Built with **vanilla CSS and JavaScript** instead of any frameworks for a smooth and engaging experience.

## Tech Stack

- Frontend: **JavaScript (without using frameworks)** for map rendering and interaction  
- Backend: Node.js (serving historical data via an API)  
- Database: A historical dataset stored in a NoSQL or relational database (e.g., MongoDB, PostgreSQL)  
- Hosting: Can be deployed on services like Vercel, Netlify (for frontend), and Heroku, AWS, or DigitalOcean (for backend)  
- **Styling**: Uses **vanilla CSS** instead of Tailwind CSS for styling.

## Installation

### Prerequisites

Ensure you have the following installed:  
- Node.js (>= 16.x)  
- npm or yarn

### Clone the Repository

```bash
git clone https://github.com/yourusername/world-history-explorer.git
cd world-history-explorer
```

### Install Dependencies

```bash
npm install  # or yarn install
```

### Run the Development Server

```bash
npm run dev  # Starts both frontend and backend in development mode
```

## API Structure

The backend provides historical data via RESTful API endpoints:  
- GET /api/history?lat={latitude}&lon={longitude}&year={year}: Retrieves historical events for a specific location and year.  
- GET /api/regions: Returns predefined regions with historical significance.

## Usage

1. Open the game in a web browser.
2. Click on any location on the map.
3. Use the timeline slider to navigate through different historical periods.
4. Explore significant historical events in that area.

## Future Improvements

- Multiplayer Mode: Allow users to explore history together in a shared session.
- AI-Generated Narratives: Use AI to generate immersive historical storytelling.
- Enhanced Data Visualization: Add layers for population density, war zones, and cultural shifts.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss improvements.

---

### Interactive Map Feature

The interactive map is a key aspect of the World History Explorer. Players will be able to click on the map to access dynamic historical data, which enhances the learning experience. The accompanying timeline slider allows users to actively explore different historical events and periods, making history more engaging and accessible.