"""
Broadcast sound themes — audio branding intros/outros for Narvo broadcasts.
Each theme has a name, description, and Tone.js parameters for the frontend.
"""

# Sound themes define parameters for the frontend's Tone.js audio engine
SOUND_THEMES = {
    "narvo_classic": {
        "id": "narvo_classic",
        "name": "Narvo Classic",
        "description": "The signature Narvo sound — clean, precise, authoritative",
        "intro": {
            "type": "fm",
            "frequency": 440,
            "duration": 1.5,
            "envelope": {"attack": 0.02, "decay": 0.3, "sustain": 0.4, "release": 0.8},
            "effects": ["reverb"],
            "notes": ["C4", "E4", "G4", "C5"],
            "tempo": 120,
        },
        "outro": {
            "type": "fm",
            "frequency": 440,
            "duration": 2.0,
            "envelope": {"attack": 0.1, "decay": 0.5, "sustain": 0.3, "release": 1.2},
            "effects": ["reverb", "delay"],
            "notes": ["C5", "G4", "E4", "C4"],
            "tempo": 80,
        },
        "transition": {
            "type": "noise",
            "duration": 0.3,
            "filter": 2000,
        },
    },
    "afrobeats": {
        "id": "afrobeats",
        "name": "Afrobeats Pulse",
        "description": "Energetic, percussive African rhythm — Lagos energy",
        "intro": {
            "type": "membrane",
            "frequency": 150,
            "duration": 2.0,
            "envelope": {"attack": 0.01, "decay": 0.2, "sustain": 0.0, "release": 0.5},
            "effects": ["distortion"],
            "notes": ["C3", "C3", "G3", "C3", "E3", "G3", "C4", "G3"],
            "tempo": 100,
            "swing": 0.2,
        },
        "outro": {
            "type": "membrane",
            "frequency": 120,
            "duration": 2.5,
            "envelope": {"attack": 0.01, "decay": 0.3, "sustain": 0.0, "release": 0.8},
            "effects": ["reverb"],
            "notes": ["C4", "G3", "E3", "C3"],
            "tempo": 80,
        },
        "transition": {
            "type": "membrane",
            "duration": 0.4,
            "filter": 800,
        },
    },
    "bbc_world": {
        "id": "bbc_world",
        "name": "World Service",
        "description": "Dignified, orchestral — global news authority",
        "intro": {
            "type": "am",
            "frequency": 220,
            "duration": 2.5,
            "envelope": {"attack": 0.3, "decay": 0.5, "sustain": 0.6, "release": 1.0},
            "effects": ["reverb", "chorus"],
            "notes": ["G3", "D4", "G4", "B4", "D5"],
            "tempo": 72,
        },
        "outro": {
            "type": "am",
            "frequency": 220,
            "duration": 3.0,
            "envelope": {"attack": 0.5, "decay": 0.8, "sustain": 0.4, "release": 1.5},
            "effects": ["reverb", "chorus"],
            "notes": ["D5", "B4", "G4", "D4", "G3"],
            "tempo": 60,
        },
        "transition": {
            "type": "sine",
            "duration": 0.5,
            "filter": 1500,
        },
    },
    "cnn_breaking": {
        "id": "cnn_breaking",
        "name": "Breaking Alert",
        "description": "Urgent, dramatic — breaking news energy",
        "intro": {
            "type": "square",
            "frequency": 880,
            "duration": 1.2,
            "envelope": {"attack": 0.01, "decay": 0.1, "sustain": 0.8, "release": 0.3},
            "effects": ["distortion"],
            "notes": ["E5", "E5", "B4", "E5", "G5", "E5"],
            "tempo": 140,
        },
        "outro": {
            "type": "triangle",
            "frequency": 440,
            "duration": 1.5,
            "envelope": {"attack": 0.05, "decay": 0.3, "sustain": 0.5, "release": 0.7},
            "effects": ["reverb"],
            "notes": ["E5", "B4", "G4", "E4"],
            "tempo": 100,
        },
        "transition": {
            "type": "square",
            "duration": 0.2,
            "filter": 3000,
        },
    },
    "midnight_jazz": {
        "id": "midnight_jazz",
        "name": "Midnight Jazz",
        "description": "Smooth, laid-back — late-night broadcast vibes",
        "intro": {
            "type": "triangle",
            "frequency": 330,
            "duration": 3.0,
            "envelope": {"attack": 0.4, "decay": 0.6, "sustain": 0.5, "release": 1.5},
            "effects": ["reverb", "delay"],
            "notes": ["C4", "Eb4", "G4", "Bb4", "C5", "Bb4", "G4"],
            "tempo": 65,
        },
        "outro": {
            "type": "triangle",
            "frequency": 330,
            "duration": 3.5,
            "envelope": {"attack": 0.5, "decay": 0.8, "sustain": 0.3, "release": 2.0},
            "effects": ["reverb", "delay", "chorus"],
            "notes": ["C5", "Bb4", "G4", "Eb4", "C4"],
            "tempo": 55,
        },
        "transition": {
            "type": "sine",
            "duration": 0.6,
            "filter": 1000,
        },
    },
}


def get_sound_themes():
    """Get all available sound themes"""
    return [
        {"id": t["id"], "name": t["name"], "description": t["description"]}
        for t in SOUND_THEMES.values()
    ]


def get_sound_theme(theme_id: str):
    """Get a specific sound theme with full parameters"""
    return SOUND_THEMES.get(theme_id)
