PROBLEM_PATTERNS = {
    "battery": [
        "battery", "battery dead", "no power",
        "light nahi jal rahi", "self nahi chal rahi",
        "battery khatam"
    ],
    "engine": [
        "engine", "engine problem", "engine band",
        "engine awaaz", "engine noise",
        "engine heat", "engine garam"
    ],
    "start": [
        "start nahi", "start nahi ho rahi",
        "not starting", "won't start",
        "self nahi", "kick nahi lag rahi"
    ],
    "puncture": [
        "puncture", "tyre puncture",
        "hawa nikal gayi", "tyre flat"
    ],
    "brake": [
        "brake", "brake jam",
        "brake kaam nahi", "bike ruk nahi rahi"
    ],
    "chain": [
        "chain", "chain loose", "chain nikal gayi"
    ],
    "fuel": [
        "petrol", "fuel", "diesel",
        "petrol khatam", "fuel leak"
    ],
    "overheat": [
        "overheat", "garam ho rahi",
        "engine garam"
    ]
}

def extract_problem(text):
    text = text.lower()

    for problem, phrases in PROBLEM_PATTERNS.items():
        for phrase in phrases:
            if phrase in text:
                return problem

    return None
# -----------------------------
# LOCATION EXTRACTION
# -----------------------------

# --------------------------------
# MANUAL LOCATION EXTRACTION
# --------------------------------

KNOWN_LOCATIONS = [
    "mp nagar", "arera", "bhopal",
    "indrapuri", "kolar", "ayodhya bypass",
    "new market", "habibganj",
    "railway station", "bus stand"
]

def extract_location(text):
    text = text.lower()

    for loc in KNOWN_LOCATIONS:
        if loc in text:
            return loc.title()

    # fallback: assume full text is location
    if len(text.split()) >= 2:
        return text.title()

    return None
