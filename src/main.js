"use strict";
var V = {};

V.init = function(params) {
    V.initializeLocations(params.map);
    V.initializeCharacters(params.characters);
    V.initializeThings(params.things);
    V.PLAYER = params.PLAYER
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
        searchTerm = searchTerms[j];
        criterion = params[searchTerm];

        if (j==0) {
            for (key in index) {
                searchTarget = index[key];
                if (searchTarget[searchTerm] && searchTarget[searchTerm] === criterion) {
                    candidates[key] = searchTarget; // can't delete items from index, so accumulate the first pass into candidates
                }
            }
        } else {
            for (key in candidates) {
                searchTarget = candidates[key];
                if (!searchTarget[searchTerm] || searchTarget[searchTerm] !== criterion) {
                    delete candidates[key]; // remove candidiates that fail subsequent passes
                }
            }
        }
    }

    return V.utils.objToArray(candidates);
};

V.getRandomLocation = function(constraint) {
    var possibilities = Object.keys(V.index.locations),
        pin,
        testLoc;
    while (possibilities.length) {
        pin = Math.floor(Math.random()*possibilities.length);
        testLoc = V.index.locations[pin];
        if (constraint) {
            if (constraint(testLoc)) {
                return testLoc;
            } else {
                possibilities.splice(pin,1);
            }
        } else {
            return testLoc;
        }
    }
    return null;
};


V.Thing = function(o) {
    var extraProp;

    this.name = o.name;
    this.description = o.description;
    // description might be a function that figures out what the text description should be, based on state of thing
    // in that case, thing is passed in as only param

    this.location = o.location || null;
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
        }
        return descString; // thing methods may have side effects. If they return text, it is handled in the default way for that game
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype.destroy = function() {
    delete V.index.things[this.id];
};
V.Thing.prototype.isPresent = function(character) {
    character = character || V.PLAYER;
    return (this.location == character.location);
};

V.Location = function(id, o) {
    this.name = o.name;
    this.description = o.description;
    this.exits = o.exits;
    this.id = id;

    V.index.locations[this.id] = this;
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

    V.index.characters[this.id] = this;
};


V.messages = { // TODO: make overrides for this
    notPresent: "What are you talking about?"
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