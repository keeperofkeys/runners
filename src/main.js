"use strict";
var V = {};

V.init = function(params) {
    V.initializeLocations(params.map);
    V.initializeThings(params.things);
    V.initializeCharacters(params.characters);

    var pChars = V.findCharactersByName(params.PLAYER);
    if (pChars.length != 1) {
        console.error('There must be exactly one character with the name ' + params.PLAYER);
        dieInAFire();
    }
    V.PLAYER = pChars[0];


    V.$CONSOLE = $('#console');
    V.$INPUT = $('#userInput');
    V.$FORM = $('#theForm');


    V.$FORM.on('submit', function(e) {
        e.preventDefault();
        var text = V.$INPUT.val();
        V.$INPUT.val('');
        V.$CONSOLE.append('<p class="user">'+ text + '</p>');
    });

    V.PLAYER.location = null;
    V.PLAYER.goTo(params.start);
};

V.index = {
    things: {},
    locations: {},
    characters: {}
};

/**
 * create a Thing object for each thing in world definition
 * @param things object
 */
V.initializeThings = function(things) {
    var thing;
    for (thing in things) {
        new V.Thing(things[thing]);
    }
};

V.initializeLocations = function(locations) {
    var handle;
    for (handle in locations) {
        new V.Location(handle, locations[handle]); // location Ids can't use GUID system
    }
};

V.initializeCharacters = function(characters) {
    var c;
    for (c in characters) {
        new V.Character(characters[c]);
    }
};

/**
 * Search the index for items matching the property values provided in params
 * @param type
 * @param params
 * @returns array of things
 */
V.genericSearch = function(params, type) {
    type = type || 'things';
    var index = V.index[type],
        key, searchTarget, criterion,
        candidates = {},
        searchTerms = Object.keys(params),
        searchTerm,
        j;

    for (j=0; j < searchTerms.length; j++) {
        searchTerm = searchTerms[j].toLowerCase();
        criterion = params[searchTerm].toLowerCase();

        if (j==0) {
            for (key in index) {
                searchTarget = index[key];
                if (searchTarget[searchTerm] && searchTarget[searchTerm].toLowerCase() === criterion) {
                    candidates[key] = searchTarget; // can't delete items from index, so accumulate the first pass into candidates
                }
            }
        } else {
            for (key in candidates) {
                searchTarget = candidates[key];
                if (!searchTarget[searchTerm] || searchTarget[searchTerm].toLowerCase() !== criterion) {
                    delete candidates[key]; // remove candidates that fail subsequent passes
                }
            }
        }
    }

    return V.utils.objToArray(candidates);
};
V.findThingsByName = function(name) { // supports multiple items with the same name
    return V.genericSearch({'name': name});
};
V.findCharactersByName = function(name) {
    return V.genericSearch({'name': name}, 'characters');
};
V.findLocationByName = function(name) {
    var locs = V.genericSearch({'name': name}, 'locations');
    if (locs) {
        return locs[0];
    } else {
        return null;
    }
};
V.getThingsInLocation = function(locationName) {
    return V.genericSearch({'location': locationName}, 'things');
};
V.getCharactersInLocation = function(locationName, includePlayer) {
    var chars = V.genericSearch({'location': locationName}, 'characters'),
        i;
    if (!includePlayer) {
        for (i = 0; i < chars.length; i++) {
            if (chars[i].id == V.PLAYER.id) {
                chars.splice(i, 1);
                break;
            }
        }
    }
    return chars;
};

V.getRandomLocation = function(constraint) {
    var possibilities = Object.keys(V.index.locations),
        pin,
        testLoc,
        testLocId;
    while (possibilities.length) {
        pin = Math.floor(Math.random()*possibilities.length);
        testLocId = possibilities[pin];
        testLoc = V.index.locations[testLocId];
        if (constraint) {
            if (constraint(testLoc)) {
                return testLocId;
            } else {
                possibilities.splice(pin,1);
            }
        } else {
            return testLocId;
        }
    }
    return null;
};
V.getThingsText = function(things) {
    var i, text = V.messages.thingsInRoom1,
        thingCount = things.length;
    for (i=0; i < thingCount; i++) {
        if (i > 0 && i == thingCount - 1) {
            text += ", and "
        } else if (i > 0) {
            text += " and "
        }
        text += things[i].grammarName;
    }
    return text + '.';
};
V.getCharactersText = function(characters) {
    var i, text = V.messages.charactersInRoom1,
        thingCount = characters.length;
    for (i=0; i < thingCount; i++) {
        if (i > 0) {
            text += "and "
        }
        text += characters[i].name;
    }
    return text + (thingCount > 1 ? V.messages.charactersInRoom2plural : V.messages.charactersInRoom2singular);
};

V.Thing = function(o) {
    var extraProp;

    this.name = o.name;
    this.grammarName = o.grammarName;
    this.description = o.description;
    // description might be a function that figures out what the text description should be, based on state of thing
    // in that case, thing is passed in as only param

    if (o.location) {
        var loc = V.findLocationByName(o.location);
    }
    this.location = o.location || null; // name, not id
    this.hidden = o.hidden || false;

    // add bespoke properties
    if (o.bespoke) {
        for (extraProp in o.bespoke) {
            this[extraProp] = o.bespoke[extraProp];
        }
    }

    // add to thing index
    this.id = V.utils.getUniqueId(this.name);
    V.index.things[this.id] = this;
};
V.Thing.prototype.lookAt = function(character) {
    character = character || V.PLAYER;
    if (this.isPresent(character)) {
        var descString;
        if (typeof this.description == 'string') {
            descString = this.description;
        } else if (typeof this.description == 'function') {
            descString = this.description(this);
        } else {
            descString = '';
        }
        return descString; // thing methods may have side effects. If they return text, it is handled in the default way for that game
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype.destroy = function(character) {
    if (this.isPresent(character)) {
        if (this.breakable) {
            delete V.index.things[this.id];
        } else {
            return V.messages.unbreakable;
        }
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype.isPresent = function(character) {
    character = character || V.PLAYER;
    return (this.location == character.location);
};
V.Thing.prototype.getDescription = function() {
    var thingText;
    if (typeof this.description == 'function') {
        thingText = this.description(this);
    } else {
        thingText = this.description ? this.description : '';
    }
    return thingText;
};

V.Location = function(id, o) {
    this.name = o.name;
    this.description = o.description;
    this.exits = o.exits;
    this.id = id;

    V.index.locations[this.id] = this;
};
V.Location.prototype.getDescription = function() {
    var locationText;
    if (typeof this.description == 'function') {
        locationText = this.description(this);
    } else {
        locationText = this.description ? this.description : '';
    }
    return locationText;
};
V.Location.prototype.getEnterText = function() {
    var locationText = this.getDescription(),
        things = V.getThingsInLocation(this.name),
        characters = V.getCharactersInLocation(this.name);

    if (things && things.length) {
        locationText += V.messages.paragraphSeparator + V.getThingsText(things);
    }
    if (characters && characters.length) {
        locationText += V.messages.paragraphSeparator + V.getCharactersText(characters);
    }
    return locationText;
};

V.Character = function(o) {
    var prop;

    this.name = o.name;
    this.id = V.utils.getUniqueId(this.name);
    this.description = o.description;
    if (o.location == "r") { // random
        this.location = V.getRandomLocation();
    } else {
        this.location = o.location;
    }
    this.money = o.money || 0;

    this.personality = {};
    for (prop in o.personality) {
        if (o.personality[prop] == 'r') {
            this.personality[prop] = Math.floor(Math.random()*21);
        } else {
            this.personality[prop] = o.personality[prop];
        }
    }

    this.inventory = [];
    if (o.inventory) {
        var i, itemName, items;
        for (i = 0; i < o.inventory.length; i++) {
            itemName = o.inventory[i];
            items = V.findThingsByName(itemName);
            this.inventory.push(items[0]);
        }
    }

    V.index.characters[this.id] = this;
};
V.Character.prototype.goTo = function(locationName) {
    if (this.location == locationName) return;

    if (this.location) {
        // TODO: check can navigate from current
    }

    this.location = locationName;
    var locationObj = V.findLocationByName(locationName);
    return locationObj.getEnterText();
};


V.messages = { // TODO: make overrides for this
    notPresent: "What are you talking about?",
    unbreakable: "Unbreakable, dammit!",
    thingsInRoom1: "You can see ",
    thingsInRoom2: ".",
    charactersInRoom1: "",
    charactersInRoom2singular: " is here.",
    charactersInRoom2plural: " are here.",
    paragraphSeparator: '<br><br>'
};

V.utils = {
    getTimestamp: function() {
        try {
            return performance.now().toString().replace('.', '');
        } catch(e) {
            return new Date().getTime().toString();
        }
    },
    camelCaseify: function(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
            if (+match === 0) return "";
            return index == 0 ? match.toLowerCase() : match.toUpperCase();
        });
    },
    getUniqueId: function(name) {
        return V.utils.camelCaseify(name) + '_' + V.utils.getTimestamp()
    },
    objToArray: function(obj) {
        var result = [],
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(obj[key]);
            }
        }
        return result;
    }
};