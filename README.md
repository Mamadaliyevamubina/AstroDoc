# Astrodoc

Health monitoring for astronauts on a Mars mission, where Earth is up to 22 minutes away and the reply to a message can take up to 44.

Built by the Dombit Education team (Tashkent) for the NASA Space Apps Challenge 2026: *Create Health Monitoring Software for Astronauts on Space Missions*.

## What it does

- **Dashboard.** Each crew member's most urgent problem and what to do now, four key readings, and a 3D body map showing where something is wrong. Reports go to the flight surgeon automatically, with the time the earliest reply can arrive.
- **Check how I feel.** A guided self-check: tap the 3D astronaut where you feel something, then answer the emergency signs first, then one question at a time. The result shows the most likely cause, what to do and why.
- **Talk to Astrodoc.** A friendly companion with sections for chat, briefing, check-in, crew and breathing. It can tell 22 real astronaut medical cases from NASA reports.
- **Radiation over the whole mission.** Each person's dose, day by day, using the dose rates NASA's Curiosity rover measured: 1.8 mSv a day in deep space and 0.67 mSv a day on Mars. It shows the day they pass NASA's 600 mSv career limit.
- **The science page** (`science.html`) lists where every number comes from, and what is simulated.

## Run it

Open `index.html` in a browser, or serve the folder (`python3 -m http.server`). It works without a server. The optional AI and voice server is in `server/`.

## Data

The crew's readings are simulated. Radiation rates, NASA limits, medical rules and astronaut cases come from NASA measurements, NASA standards and published studies. See `science.html`.

Prototype, not a medical device.

## Credits

- 3D astronaut: "astronaut" by Antropik, CC BY 4.0 (made smaller for the web).
- Fonts: Atkinson Hyperlegible Next (Braille Institute) and Sora, SIL Open Font License.
- three.js, MIT License.
- Backgrounds and icons drawn for Astrodoc.
