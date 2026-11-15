# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience for the design: the judges of the NASA Space Apps Challenge 2026 (challenge: "Create Health Monitoring Software for Astronauts on Space Missions"), who see Astrodoc in a short demo and must remember it and believe it.

The people the product is for: the crew of a long Mars mission (commander, pilot, mission specialist) checking their own and each other's health, far from Earth, without waiting for a doctor.

## Product Purpose

Health monitoring for astronauts on a Mars mission, where Earth is up to 22 minutes away and a reply can take up to 44. Astrodoc tells each crew member what is wrong, why, and what to do now, and reports to the flight surgeon on Earth without making the crew wait for the answer.

Success: a judge understands within seconds what Astrodoc does and why the delay to Earth makes it necessary, and remembers it after the demo.

## Positioning

Built around the signal delay to Earth: it acts on board immediately and treats Earth as a slow, asynchronous second opinion, not a live doctor. It combines simulated crew readings with real NASA measurements, standards and documented astronaut medical cases.

## Operating Context

- Dashboard: each crew member's most urgent problem and what to do now, four key readings, a 3D body map, automatic reports to the flight surgeon with the earliest reply time.
- Check how I feel: guided self-check (tap the 3D astronaut, emergency signs first, one question at a time, mood check-in, result with likely cause and steps).
- Talk to Astrodoc: a companion with a face, voice, chat, briefing, check-in, breathing, real NASA astronaut cases.
- Radiation over the whole mission using Curiosity rover dose rates; NASA's 600 mSv career limit.
- Live pulse sensor: Arduino + MAX30102 over Web Serial (Chrome/Edge).
- Science page listing where every number comes from and what is simulated.

## Capabilities and Constraints

- Plain static HTML/CSS/JS, no build step; works opened as a file or served (GitHub Pages, Netlify).
- Crew readings are simulated; rules and rates come from NASA sources (see science.html).
- Prototype, not a medical device.
- Health status uses three levels (All good / Watch / Needs care now).

## Brand Commitments

- The name "Astrodoc" and the planet logo mark (assets/astrodoc-logo-mark.png) stay.
- Team: Dombit Education (Tashkent).

## Evidence on Hand

- NASA sources and dose rates documented in science.html.
- 22 real astronaut medical cases from NASA reports (data/space-medicine-cases.js).
- 3D astronaut model "astronaut" by Antropik, CC BY 4.0.
- No real users, testimonials or clinical validation: never invent them.

## Product Principles

- Act now on board; Earth is informed, never waited for.
- Every number traceable to a source, or labeled simulated.
- Plain words a tired person can follow, one step at a time.
- Emergencies first, always.
