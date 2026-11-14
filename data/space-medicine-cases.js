// AstroDoc space medicine cases: the case database (see "about" below).
// A script, not a .json file, so it also loads when chat.html is opened straight from the computer (file://).
window.SPACE_CASES = {
  "title": "AstroDoc space medicine cases",
  "about": "Real, publicly documented cases where astronauts reported how they felt in space and NASA flight surgeons or doctors responded. Each case is summarized in plain words from the cited NASA or peer-reviewed source. Astronauts are identified only by crew role, as in the sources. This is history and education, not medical advice: medicine names describe what was done at the time, not what anyone should take.",
  "updated": "2026-11-14",
  "cases": [
    {
      "id": "apollo7-cold",
      "mission": "Apollo 7",
      "year": 1968,
      "who": "Commander, then the other two crewmen",
      "tags": [
        "cold",
        "congestion",
        "temp"
      ],
      "felt": "About 15 hours after launch the commander reported a bad head cold. A day later the other two crewmen had cold symptoms too.",
      "response": "The flight surgeon recommended aspirin and a decongestant (Actifed) every eight hours. Before re-entry the crew left their helmets off so they could equalize pressure in their ears, and took the last decongestants in the final day.",
      "outcome": "No ear problems during re-entry, and the two worst-affected crewmen had no cold left after the flight.",
      "lesson": "In a closed cabin an infection spreads to the whole crew. Treat symptoms early and plan around pressure changes.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo8-stomach-flu",
      "mission": "Apollo 8",
      "year": 1968,
      "who": "Commander",
      "tags": [
        "nausea",
        "headache",
        "sleep",
        "temp"
      ],
      "felt": "After a fitful sleep of about five hours he felt nauseated with a moderate headache at the back of his head, vomited twice and had stomach trouble.",
      "response": "The flight surgeon suspected a viral stomach infection. The commander was advised to take an anti-diarrhea medicine and an anti-nausea medicine if the nausea came back. His temperature was checked.",
      "outcome": "He recovered fully without further medicine. He called it a 24-hour intestinal flu.",
      "lesson": "Poor sleep, headache and nausea together can be an infection or space sickness. Check temperature and watch it closely.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo9-motion-sickness",
      "mission": "Apollo 9",
      "year": 1969,
      "who": "Lunar Module Pilot",
      "tags": [
        "nausea",
        "motion sickness",
        "sleep"
      ],
      "felt": "He had motion sickness and vomited twice, before and after moving into the lunar module.",
      "response": "He was advised to take an anti-nausea medicine an hour before suiting up, and the spacewalk was cut down to only the most important tasks.",
      "outcome": "Keeping still eased the symptoms, there was no more vomiting after about 50 hours, and the priority spacewalk tasks were done in about 45 minutes.",
      "lesson": "Space sickness usually passes in a few days. Move slowly, keep still when it's bad, and lighten the workload rather than push through.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo10-fiberglass",
      "mission": "Apollo 10",
      "year": 1969,
      "who": "All three crewmen",
      "tags": [
        "skin",
        "eyes",
        "breathing"
      ],
      "felt": "Loose fiberglass particles irritated their skin, eyes and airways. They also had a rumbling stomach from gas bubbles in the drinking water.",
      "response": "The irritation was treated for the symptoms.",
      "outcome": "Good results from the symptom treatment.",
      "lesson": "In a spacecraft, the cabin itself can make people sick. Ask what changed in the environment, not only in the body.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo13-headache-uti",
      "mission": "Apollo 13",
      "year": 1970,
      "who": "Lunar Module Pilot",
      "tags": [
        "headache",
        "nausea",
        "infection",
        "temp"
      ],
      "felt": "On day two he woke with a moderately severe headache and later vomited after breakfast and activity. A crewman also developed a urinary tract infection.",
      "response": "He took aspirin, with fair results.",
      "outcome": "The headache and nausea faded over about 12 hours as he adapted to weightlessness. NASA noted the urinary infection could have become serious if the mission had lasted another day.",
      "lesson": "Most early symptoms are adaptation, but an infection can grow quickly far from Earth. Report fever or pain when passing urine right away.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo14-stuffy-nose",
      "mission": "Apollo 14",
      "year": 1971,
      "who": "Commander and Lunar Module Pilot",
      "tags": [
        "congestion"
      ],
      "felt": "Nasal stuffiness from the dry spacecraft air.",
      "response": "Each used one decongestant nose drop in each nostril on day three; the command module pilot used nose drops before re-entry.",
      "outcome": "Relief was prompt and lasted about 12 hours.",
      "lesson": "A blocked nose is common in space because body fluid shifts toward the head. Simple relief works.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo15-heart-rhythm",
      "mission": "Apollo 15",
      "year": 1971,
      "who": "Lunar Module Pilot and Commander",
      "tags": [
        "hr",
        "tired",
        "heart rhythm"
      ],
      "felt": "After hard work on the Moon the lunar module pilot reported extreme fatigue and needed a short rest. Monitors showed irregular heartbeats in him and, later during sleep, in the commander. Neither felt the irregular beats.",
      "response": "The medical team traced the irregular rhythm on the heart monitors. NASA linked it to a possible potassium deficit and fatigue.",
      "outcome": "The crew completed the mission. NASA reviewed the potassium and fatigue findings after the flight.",
      "lesson": "Heart rhythm problems can be silent. Extreme tiredness after heavy work is worth reporting even when you feel nothing else.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo15-shoulder",
      "mission": "Apollo 15",
      "year": 1971,
      "who": "Commander",
      "tags": [
        "pain",
        "exercise"
      ],
      "felt": "Right shoulder pain after difficult deep drilling on the Moon.",
      "response": "He took aspirin over several days. NASA's report does not describe a doctor's instruction for it.",
      "outcome": "He continued the mission.",
      "lesson": "Hard physical tasks in a stiff suit strain joints. Tell the medical team about pain instead of only treating it yourself.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo16-sleep",
      "mission": "Apollo 16",
      "year": 1972,
      "who": "Lunar Module Pilot",
      "tags": [
        "sleep"
      ],
      "felt": "Trouble sleeping before the Moon landing and on the lunar surface.",
      "response": "He took a sleep medicine on three nights, including the night before the landing.",
      "outcome": "After the flight he reported it gave a rapid onset of good sleep.",
      "lesson": "Sleep before a critical task matters. Plan rest the night before big days.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "apollo17-stomach",
      "mission": "Apollo 17",
      "year": 1972,
      "who": "All three crewmen",
      "tags": [
        "nausea",
        "stomach",
        "sleep"
      ],
      "felt": "The commander had stomach awareness on day two and daily gas. Two crewmen had loose bowels late in the mission.",
      "response": "The commander took an anti-nausea capsule on day two and an anti-gas medicine daily; an anti-diarrhea medicine was taken for the loose bowels. All three used sleep medicine at times.",
      "outcome": "The anti-diarrhea medicine was effective.",
      "lesson": "Small stomach problems are common in flight and usually easy to handle when reported early.",
      "source": {
        "title": "Biomedical Results of Apollo (NASA SP-368), Clinical Aspects of Crew Health",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-368/s2ch1.htm"
      }
    },
    {
      "id": "iss-jugular-clot",
      "mission": "International Space Station",
      "year": 2020,
      "who": "An ISS crewmember (not named)",
      "tags": [
        "clot",
        "labs",
        "trend"
      ],
      "felt": "A blood clot in the jugular (neck) vein was found during a research ultrasound about two months into a six-month mission. It was the first time NASA had found this in space.",
      "response": "Doctors on Earth, including an outside blood-clot specialist, guided the astronaut's own ultrasound scans in real time and started a blood thinner that was on board (enoxaparin). The dose was lowered so the supply would last until a cargo ship delivered a second blood thinner (apixaban).",
      "outcome": "The clot shrank. The astronaut stopped the blood thinner shortly before landing, and after landing no more treatment was needed.",
      "lesson": "Clots can form in space with no warning. Follow the clot checklist, use the ultrasound with Earth's guidance, and report at once.",
      "source": {
        "title": "Venous Thrombosis during Spaceflight, New England Journal of Medicine (2020)",
        "url": "https://www.nejm.org/doi/full/10.1056/NEJMc1905875"
      }
    },
    {
      "id": "shuttle-space-sickness",
      "mission": "Space Shuttle flights",
      "year": 1993,
      "who": "Shuttle crewmembers on their first flights",
      "tags": [
        "nausea",
        "motion sickness"
      ],
      "felt": "Space motion sickness in the first days of flight: nausea, vomiting and feeling unwell.",
      "response": "NASA flight surgeons gave an anti-nausea injection (promethazine), which became their medicine of choice for space sickness.",
      "outcome": "In one NASA comparison, 14 of 15 crewmembers given the injection had relief within 12 hours.",
      "lesson": "Space sickness is common and treatable. Say so early instead of working through it.",
      "source": {
        "title": "NASA Technical Reports Server: space motion sickness treatment studies",
        "url": "https://ntrs.nasa.gov/citations/20040120570"
      }
    },
    {
      "id": "iss-co2-headache",
      "mission": "International Space Station",
      "year": 2014,
      "who": "ISS crewmembers, 2001 to 2012",
      "tags": [
        "headache",
        "tired"
      ],
      "felt": "Crews reported headaches on the station.",
      "response": "A NASA flight surgeon, Dr Jennifer Law, studied ISS crew data from 2001 to 2012 and found that for each 1 mm Hg rise in cabin carbon dioxide, the odds of a crew headache doubled. The study supported keeping station CO2 at or below 4 mm Hg.",
      "outcome": "NASA works to keep station CO2 low, within what the air system can do.",
      "lesson": "A headache in space can come from the air, not just the body. Check cabin CO2 and ventilation when several people have headaches.",
      "source": {
        "title": "Headaches an occupational hazard for astronauts (on Law et al., Journal of Occupational and Environmental Medicine, 2014)",
        "url": "https://www.news-medical.net/news/20140501/Headaches-an-occupational-hazard-astronauts.aspx"
      }
    },
    {
      "id": "iss-vision",
      "mission": "Long-duration ISS missions",
      "year": 2023,
      "who": "Long-duration astronauts",
      "tags": [
        "eyes",
        "vision"
      ],
      "felt": "Many long-duration astronauts reported that their near and distance vision got worse in space.",
      "response": "NASA eye specialists named it Spaceflight Associated Neuro-ocular Syndrome (SANS), monitor astronauts' eyes, and supply glasses of different strengths on board so astronauts can switch as their vision changes.",
      "outcome": "A NASA optometrist has said no one has had permanent vision loss from SANS, though some astronauts' prescriptions stayed changed for years.",
      "lesson": "Blurry vision in space should be reported and checked, and spare glasses help right away.",
      "source": {
        "title": "Eye Problems Cloud NASA's Vision of Mars (Scientific American)",
        "url": "https://www.scientificamerican.com/article/nasas-mars-plans-complicated-by-eye-problems-during-long-spaceflights/"
      }
    },
    {
      "id": "iss-back-pain",
      "mission": "Long-duration ISS missions",
      "year": 2016,
      "who": "U.S. astronauts",
      "tags": [
        "pain",
        "back"
      ],
      "felt": "Over half of U.S. astronauts report spine pain during their mission, as the spine stretches without gravity.",
      "response": "Astronauts report that curling into a flexed fetal tuck position to stretch is the most effective relief. Researchers recommend exercise to protect the back muscles.",
      "outcome": "Back muscle loss was measured after flight, and new exercise countermeasures are being studied.",
      "lesson": "Back pain early in a mission is common. Stretching in a tuck position helps; keep up the exercise plan.",
      "source": {
        "title": "Lumbar spine paraspinal muscle and disc changes in astronauts after long-duration spaceflight (Spine, 2016)",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5588025"
      }
    },
    {
      "id": "iss-sleep",
      "mission": "International Space Station",
      "year": 2015,
      "who": "24 U.S. crewmembers on missions longer than 30 days",
      "tags": [
        "sleep",
        "tired"
      ],
      "felt": "Trouble falling and staying asleep was one of the most common problems on long missions.",
      "response": "Sleep medicine was the most used kind of medicine, often linked to spacewalks and schedule changes. The NASA study suggested changing schedules could reduce the need.",
      "outcome": "Sleep aid use was about ten times higher than in adults on Earth.",
      "lesson": "Sleep in space is hard. Protect regular sleep times, especially around big schedule changes.",
      "source": {
        "title": "Medication use by U.S. crewmembers on the International Space Station (Wotring, FASEB Journal 2015, NASA copy)",
        "url": "https://ntrs.nasa.gov/api/citations/20140017010/downloads/20140017010.pdf"
      }
    },
    {
      "id": "iss-isolation",
      "mission": "International Space Station",
      "year": 2023,
      "who": "Long-duration crews",
      "tags": [
        "mood",
        "lonely",
        "stress"
      ],
      "felt": "Being far from home and confined with the same few people for months can feel lonely and stressful.",
      "response": "NASA offers crews private conferences with a NASA doctor or mental health provider, video chats with friends and family, and care packages with personal items like family photos and a favorite snack.",
      "outcome": "Support for mental health is built into every long mission.",
      "lesson": "Feeling lonely or low in space is normal and expected. Talk to someone, and keep in touch with home.",
      "source": {
        "title": "NASA: Isolation, what can we learn from the experiences of NASA astronauts",
        "url": "https://www.nasa.gov/humans-in-space/isolation-what-can-we-learn-from-the-experiences-of-nasa-astronauts"
      }
    }
  ]
};
