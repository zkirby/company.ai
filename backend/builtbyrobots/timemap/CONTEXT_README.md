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

### Historical Facts about Brazil

- **Portuguese Discovery (1500):** Brazil was officially discovered by Portuguese explorer Pedro Álvares Cabral on April 22, 1500, marking the beginning of European exploration in South America.
- **Colonial Brazil (1500-1822):** Brazil remained a colony of Portugal for over 300 years, during which sugar cane became the dominant economic activity, leading to the establishment of a large importation of African slaves.
- **Independence (1822):** Brazil declared its independence from Portugal on September 7, 1822, which was led by Dom Pedro I, the son of the King of Portugal.
- **Abolition of Slavery (1888):** Brazil was the last country in the Americas to abolish slavery. The Lei Áurea (Golden Law) was passed on May 13, 1888, officially freeing all enslaved people in Brazil.
- **Military Dictatorship (1964-1985):** Brazil underwent a military coup in 1964, leading to two decades of authoritarian rule that saw severe human rights violations, political repression, and censorship.

### Historical Facts about Spain

- **Spanish Reconquista (718-1492):** The Reconquista was a centuries-long campaign by Christian states to recapture territory from the Moors, leading to the fall of Granada and the unification of Spain under Christian rule in 1492.
- **Christopher Columbus (1492):** Sponsored by Spain, Columbus made his famous voyage across the Atlantic Ocean, landing in the Americas and marking the beginning of Spanish colonization in the New World.
- **Spanish Empire (16th-17th Centuries):** At its height, the Spanish Empire was one of the largest empires in history, encompassing territories in Europe, the Americas, Asia, and Africa.
- **Spanish Civil War (1936-1939):** A significant conflict that led to the rise of Francisco Franco's dictatorship, shaped modern Spanish history, and influenced art and literature.
- **Transition to Democracy (1975):** Following Franco's death, Spain transitioned to democracy, leading to the establishment of a constitutional monarchy and significant social and political changes.