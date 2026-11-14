// AstroDoc space medicine cases: the case database (see "about" below).
// A script, not a .json file, so it also loads when chat.html is opened straight from the computer (file://).
window.SPACE_CASES = {
  "title": "AstroDoc space medicine cases",
  "about": "Real, publicly documented cases where astronauts reported how they felt in space and NASA flight surgeons or doctors responded. Every case comes only from NASA sources (NASA reports, NASA history books and the NASA Technical Reports Server) and is summarized in plain words. Astronauts are identified only by crew role. This is history and education, not medical advice: medicine names describe what was done at the time, not what anyone should take.",
  "updated": "2026-11-15",
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
      "year": 2019,
      "who": "An ISS crewmember (not named)",
      "tags": [
        "clot",
        "labs",
        "trend"
      ],
      "felt": "During a NASA study, ultrasound scans around day 50 of the mission showed slow or backward blood flow in the neck vein in 6 of 11 crewmembers, and one crewmember had a blood clot blocking the vein. NASA lists the warning signs as neck vein swelling, more face or eyelid puffiness than usual in space, and headache, though a clot can also give no symptoms.",
      "response": "NASA flight surgeons on the ground treated the crewmember in space with blood-thinning medicine, guided by ultrasound scans done on the station. The blood thinner was stopped several days before landing, so bleeding would be less dangerous if there was an injury on the way home.",
      "outcome": "With treatment the crewmember completed the mission. NASA now screens crews for this kind of clot and has a working group that wrote in-flight treatment guidelines.",
      "lesson": "A clot can form in space without warning. Report neck swelling, a puffy face beyond the usual, or a new headache, and follow the clot checklist with Earth's guidance.",
      "source": {
        "title": "NASA Venous Thromboembolism (VTE) Working Group Summary Report, April 2025",
        "url": "https://ntrs.nasa.gov/api/citations/20250001074/downloads/Venous%20Thromboembolism%20VTE%20Report%20REV1%20April%202025.pdf"
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
      "who": "ISS astronauts",
      "tags": [
        "headache",
        "tired"
      ],
      "felt": "Headaches were reported by 19 of 49 ISS astronauts in a NASA study. Most were moderate and often needed pain relief medicine. Tiredness and poor sleep were also reported when carbon dioxide was higher.",
      "response": "Astronauts usually tell their flight surgeon about these symptoms in a private medical conference. The flight surgeon then asks the engineers to adjust the station's air system to lower the carbon dioxide.",
      "outcome": "NASA's health standard now limits cabin carbon dioxide to keep headaches rare.",
      "lesson": "A headache in space can come from the air, not just the body. Tell the doctor, and check the cabin carbon dioxide when several people have headaches.",
      "source": {
        "title": "NASA-STD-3001 Technical Brief: Carbon Dioxide (OCHMO-TB-004)",
        "url": "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf"
      }
    },
    {
      "id": "iss-vision",
      "mission": "Long-duration ISS missions",
      "year": 2024,
      "who": "Long-duration astronauts",
      "tags": [
        "eyes",
        "vision"
      ],
      "felt": "Seventy percent of long-duration crew show at least one sign of eye changes in space (Spaceflight Associated Neuro-ocular Syndrome), and many notice their near vision getting blurrier.",
      "response": "NASA eye doctors check every crewmember's eyes before, during and after flight. Every astronaut flies with at least three pairs of prescription glasses of different strengths, called Space Anticipation Glasses, so they can switch as their vision changes.",
      "outcome": "NASA reports that, to date, no permanent loss of vision has been found in any crewmember.",
      "lesson": "Blurry vision in space should be reported and checked. Switching to the stronger pair of glasses helps right away.",
      "source": {
        "title": "NASA-STD-3001 Technical Brief: Spaceflight Associated Neuro-ocular Syndrome (OCHMO-MTB-001)",
        "url": "https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf"
      }
    },
    {
      "id": "iss-back-pain",
      "mission": "Space Shuttle flights",
      "year": 1995,
      "who": "Shuttle crewmembers",
      "tags": [
        "pain",
        "back"
      ],
      "felt": "Fourteen of 19 Shuttle crewmembers had back pain in space. They described it as a dull ache, mostly in the lower back, and usually mild.",
      "response": "NASA researchers traced the pain to the spine stretching a few centimeters without gravity, and recreated it on Earth in a head-down bed-rest study to learn how to treat it.",
      "outcome": "The pain eased once the spine stopped lengthening, usually within the first days.",
      "lesson": "Back pain early in a mission is common and usually passes. Gentle stretching and the exercise plan help.",
      "source": {
        "title": "NASA: Back Pain During 6 deg Head-Down Tilt Approximates That During Actual Microgravity (1995)",
        "url": "https://ntrs.nasa.gov/citations/19970016831"
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
    },
    {
      "id": "iss-congestion",
      "mission": "International Space Station",
      "year": 2019,
      "who": "ISS crewmembers, 2001 to 2018",
      "tags": [
        "congestion",
        "headache",
        "sleep"
      ],
      "felt": "A blocked, stuffy nose is one of the most common complaints on the station. More than half of crewmembers used medicine for congestion, and it came with headaches and poorer sleep.",
      "response": "NASA flight surgeons collected these complaints in private medical conferences and studied them. They found congestion was linked with headaches and became more likely as the station got older, possibly from floating dust and mold.",
      "outcome": "NASA doctors treat it as a real health issue, because it can disturb sleep, lead to sinus infections and even prevent spacewalks.",
      "lesson": "Don't ignore a stuffy nose in space. Report it, especially with a headache or poor sleep.",
      "source": {
        "title": "NASA: Nasal Congestion on the International Space Station (Weinberg et al., 2019)",
        "url": "https://ntrs.nasa.gov/api/citations/20200001669/downloads/20200001669.pdf"
      }
    },
    {
      "id": "astp-toxic-gas",
      "mission": "Apollo-Soyuz",
      "year": 1975,
      "who": "All three crewmembers",
      "tags": [
        "breathing",
        "chest",
        "cough"
      ],
      "felt": "During landing, toxic gas from the thrusters leaked into the capsule for almost five minutes. One crewmember was unconscious when the capsule was opened, and the crew had chest tightness, a burning feeling behind the breastbone and a cough on deep breaths.",
      "response": "Doctors treated them in hospital with steroid medicine, watching closely because lung swelling from this gas appears about a day later.",
      "outcome": "Their chest X-rays were normal again five days after landing, they left hospital after about six days, and no long-term health effects were reported.",
      "lesson": "After breathing fumes, symptoms can get worse a day later. Report chest tightness or coughing right away, even if it seems mild.",
      "source": {
        "title": "NASA: Aerospace Toxicology and Microbiology (James)",
        "url": "https://ntrs.nasa.gov/api/citations/20070032022/downloads/20070032022.pdf"
      }
    },
    {
      "id": "skylab3-motion-sickness",
      "mission": "Skylab 3",
      "year": 1973,
      "who": "The whole crew",
      "tags": [
        "nausea",
        "motion sickness"
      ],
      "felt": "All three crewmembers had motion sickness starting on launch day, and felt worst after full meals.",
      "response": "NASA doctors recommended eating more, smaller meals. A motion-sickness expert advised gentle head movements a few times a day rather than only resting, and Houston let the crew set up the station at their own pace.",
      "outcome": "The crew recovered. Afterwards preventing motion sickness became a top priority for NASA.",
      "lesson": "With space sickness, eat small meals, go at your own pace and tell the doctors. A day or two longer is fine.",
      "source": {
        "title": "NASA History: Living and Working in Space (SP-4208), Chapter 16",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-4208/ch16.htm"
      }
    },
    {
      "id": "skylab4-hidden-sickness",
      "mission": "Skylab 4",
      "year": 1973,
      "who": "The pilot",
      "tags": [
        "nausea",
        "report"
      ],
      "felt": "On the first day in the station the pilot vomited. The crew talked about keeping it quiet and reported only that he hadn't eaten his meal.",
      "response": "The flight surgeons learned about it from an onboard recording and held a medical conference with the crew that afternoon. They treated vomiting as more serious than nausea. Mission management reminded the crew that hiding symptoms was a serious mistake.",
      "outcome": "The pilot was recovering by the next morning, and the commander agreed that hiding it had been a bad decision.",
      "lesson": "Always tell the doctors how you really feel. They can only help with what they know about.",
      "source": {
        "title": "NASA History: Living and Working in Space (SP-4208), Chapter 17",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-4208/ch17.htm"
      }
    },
    {
      "id": "skylab4-workload",
      "mission": "Skylab 4",
      "year": 1973,
      "who": "The whole crew",
      "tags": [
        "stress",
        "tired",
        "mood"
      ],
      "felt": "The crew felt rushed and very frustrated by a packed schedule. The commander said falling behind was demoralizing and that a 16-hour day was more than they would work on the ground.",
      "response": "The crew asked for an honest talk, and on 30 December 1973 they discussed it openly with Mission Control. Houston gave them an uninterrupted hour before bed and let them do non-urgent tasks whenever suited them best. The workload had already been cut by about 15 percent.",
      "outcome": "Two days later the flight director said the crew was more alert, ahead of the plan and organizing its own schedule. The crew physician had also noted they seemed less rushed.",
      "lesson": "Feeling overloaded is worth saying out loud. A calmer, more flexible schedule helps both health and work.",
      "source": {
        "title": "NASA History: Living and Working in Space (SP-4208), Chapter 17",
        "url": "https://www.nasa.gov/wp-content/uploads/static/history/SP-4208/ch17.htm"
      }
    }
  ]
};
