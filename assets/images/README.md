# Blood on the Clocktower Role Images

This directory contains optional character artwork for Blood on the Clocktower. The checked-in PNG set currently covers Trouble Brewing and Bad Moon Rising; characters without artwork use the app's vector category fallback.

## Directory Structure

- `townsfolk/` - Townsfolk character images
- `outsiders/` - Outsider character images  
- `minions/` - Minion character images
- `demons/` - Demon character images
- `travellers/` - Traveller character images
- `fabled/` - Fabled character images (if applicable)

## Image Naming Convention

Images should be named using the character's ID (lowercase, matching the character definition in the scripts):

Examples:
- `washerwoman.png`
- `imp.png`
- `poisoner.png`
- `scapegoat.png`

## How to Download Images

### Method 1: Manual Download from Wiki

1. Visit the Blood on the Clocktower Wiki: https://wiki.bloodontheclocktower.com/
2. Navigate to the character page (e.g., https://wiki.bloodontheclocktower.com/Washerwoman)
3. Right-click on the character image/icon
4. Save the image with the character's ID as the filename (e.g., `washerwoman.png`)
5. Place it in the appropriate directory (`townsfolk/`, `outsiders/`, `minions/`, `demons/`, or `travellers/`)

### Method 2: Using Browser Developer Tools

1. Open the wiki page for a character
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Filter by "Img" or "Image"
5. Refresh the page
6. Find the character image in the network requests
7. Right-click and "Open in new tab"
8. Save the image with the correct filename

### Method 3: Bulk Download Script

You can create a script to download images programmatically. Here's a Python example:

```python
import requests
from bs4 import BeautifulSoup
import os

# Character IDs by type
characters = {
    'townsfolk': ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier', 'mayor'],
    'outsiders': ['butler', 'drunk', 'recluse', 'saint'],
    'minions': ['poisoner', 'spy', 'scarletwoman', 'baron'],
    'demons': ['imp'],
    'travellers': ['scapegoat', 'gunslinger', 'beggar', 'bureaucrat', 'thief']
}

base_url = 'https://wiki.bloodontheclocktower.com/'

for char_type, char_list in characters.items():
    for char_id in char_list:
        url = f'{base_url}{char_id.title()}'
        # Download logic here
        # Save to appropriate directory
```

## Image Requirements

- **Format**: PNG (required by the current runtime and Pages artifact)
- **Size**: Recommended 256x256px or larger (will be scaled down in UI)
- **Background**: Transparent background preferred
- **Quality**: High quality, clear images

## Character Lists

### Trouble Brewing

**Townsfolk**: washerwoman, librarian, investigator, chef, empath, fortuneteller, undertaker, monk, ravenkeeper, virgin, slayer, soldier, mayor

**Outsiders**: butler, drunk, recluse, saint

**Minions**: poisoner, spy, scarletwoman, baron

**Demons**: imp

**Travellers**: scapegoat, gunslinger, beggar, bureaucrat, thief

### Bad Moon Rising

**Townsfolk**: grandmother, sailor, chambermaid, exorcist, innkeeper, gambler, gossip, courtier, professor, minstrel, tealady, pacifist, fool

**Outsiders**: tinker, moonchild, goon, lunatic

**Minions**: godfather, devilsadvocate, assassin, mastermind

**Demons**: zombuul, pukka, shabaloth, po

**Travellers**: apprentice, matron, voudon, judge, bishop

### Sects & Violets

**Townsfolk**: clockmaker, dreamer, snakecharmer, mathematician, flowergirl, towncrier, oracle, savant, seamstress, philosopher, artist, juggler, sage

**Outsiders**: mutant, sweetheart, barber, klutz

**Minions**: eviltwin, witch, cerenovus, pithag

**Demons**: fanggu, vigormortis, nodashi, vortox

**Travellers**: barista, harlot, butcher, bonecollector, deviant

## Notes

- Images gracefully fall back when the corresponding PNG is absent.
- The app displays reusable vector category icons when images are missing.
- Ensure all images are properly licensed for use
