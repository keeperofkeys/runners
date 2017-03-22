"use strict";
var V = {};
V.debug = true;
V.init = function(params) {
    V.initializeLocations(params.locations);
    V.initializeThings(params.things);
    if (params.alignments) {
        V.alignments = []; // no index, just a simple list
        V.initializeAlignments(params.alignments);
    }
    if (params.roles) {
        V.roles = [];
        V.initializeRoles(params.roles);
    }
    V.initializeCharacters(params.characters);

    var pChars = V.findCharactersByName(params.PLAYER);
    if (pChars.length != 1) {
        console.error('There must be exactly one character with the name ' + params.PLAYER);
        dieInAFire();
    }
    V.PLAYER = pChars[0];

    if (params.messageOverrides) {
        V.messages = $.extend(V.messages, params.messageOverrides);
    }
    V.$CONSOLE = $('#console');
    V.$INPUT = $('#userInput');
    V.$FORM = $('#theForm');
    V.SCREEN = document.getElementById('screen');
    V.SCREENWindow = V.SCREEN.contentWindow;
    V.SCREENDocument = V.SCREENWindow.document;
    V.pagePath ='world/pages/';
    V.scrollConsoleToBottom =function () {
        V.$CONSOLE.scrollTop(V.$CONSOLE.height());
    };

    // handle user input
    V.$FORM.on('submit', function(e) {
        e.preventDefault();
        var text = V.$INPUT.val();
        V.$INPUT.val('');
        V.$CONSOLE.append('<p class="user">'+ text + '</p>');
        V.scrollConsoleToBottom();
        V.commandHistory.push(text);
        V.interpret(text);
        V.scrollConsoleToBottom();
    });

    // navigated to new screen
    $(V.SCREEN).bind('load', function(e) {
        var title = $(V.SCREEN).contents().find('title').text(),
            loc;
        if (!title) {
            loc = V.findLocationByName(V.PLAYER.location);
            title = loc.name;
        }
        document.title = title;
    });

    V.PLAYER.location = null;
    var start = V.findLocationByName(params.start),
        placeDescription = start.goTo(V.PLAYER, true);
    V.sendToConsole(placeDescription);
};
V.personalityAttributes = ['dexterity', 'charisma', 'stamina', 'morality', 'experience'];

V.index = {
    things: {},
    locations: {},
    characters: {},
    verbs: {
        look: function() {

        }
    }
};
V.knowledgeMatrix = {};
/* not upper triangular or symmetric, as one char might know more about another
    than that char does about them entries are of the form
    {
         charid1: {
                       charid2: {
                           <some suspected or known trait>: <value>
                           etc
                       }
                   },
         charid2: {
                       charid2: {
                           <some suspected or known trait>: <value>
                           etc
                       }
                   },


         null or undefined // ie they don't know anything about them
    }
    traits are completely up to the game to define and use
    but falsy values will be used by the engine in places where it matters
    if the player knows that person or not
*/
// low level getter and setter
V.getKnowledge = function (a, b) {
    if (!V.knowledgeMatrix[a]) {
        return undefined;
    } else {
        return V.knowledgeMatrix[a][b];
    }
};
V.addKnowledge = function (a, b, data) {
    var currentKnowledge;
    if (!V.knowledgeMatrix[a]) {
        V.knowledgeMatrix[a] = {};
        V.knowledgeMatrix[a][b] = data;
        return;
    }
    currentKnowledge = V.getKnowledge(a, b);
    if (!currentKnowledge) {
        V.knowledgeMatrix[a][b] = data;
    } else {
        V.knowledgeMatrix[a][b] = $.extend(currentKnowledge, data);
    }
};

V.aliases = {}; // overridden in separate file(s)
V.commandHistory = [];
V.regexes = {
    spaceSplitter : /\s+/,
    initialWS: /^\s+/,
    finalWS: /\s+$/
};
V.interpret = function (text) {
    text = text.replace(V.regexes.initialWS, '').replace(V.regexes.finalWS, '');

    // attempt to parse as into <verb> [garbage] [<thing|location|character>]
    var bits = text.split(V.regexes.spaceSplitter),
        wordCount = bits.length,
        directObject = bits.length > 1 ? bits[wordCount - 1] : '', // last word
        verb = bits.length > 1 ? bits.slice(0, wordCount - 1).join(' ') : bits[0],
        mcguffin,
        actionName,
        output = V.messages.totallyConfused;

    V.log('bits: ' + bits);
    V.log('directObject: ' + directObject);
    V.log('verb: ' + verb);

    if (directObject) {
        // what kind of object is it?
        mcguffin = V.findThingsByName(directObject);
        if (!mcguffin || !mcguffin.length) {
            mcguffin = V.findCharactersByName(directObject);
        }
        if (mcguffin.length > 0) {
            mcguffin = mcguffin[0]; // TODO: handle multiple results better
        } else {
            mcguffin = V.findLocationByName(directObject);
        }
    }

    V.log('mcguffin: ' + mcguffin);

    if (!mcguffin) { // no direct object, so assume it's the location
        mcguffin = V.findLocationByName(V.PLAYER.location);
    }

    if (mcguffin) {

        actionName = mcguffin[verb] ? verb : V.utils.camelCaseify(verb);

        V.log('actionName: ' + actionName);
        if (actionName && typeof mcguffin[actionName] == 'function') {
            output = mcguffin[actionName].apply(mcguffin); // carry out action

            if (output) {
                V.sendToConsole(output);
            }
            return;
        } else {
            output = V.messages.unknownActionToObject;
        }
    } else {
        output = V.messages.unknownItem;
    }



    // that failed. Try built in commands like "i", "look"
    // TODO

    if (output) {
        V.sendToConsole(output);
    }

};

V.sendToConsole = function(text) {
    V.$CONSOLE.append('<p class="system">'+text+'</p>');
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
    var handle,
        locationName,
        locationObj,
        direction,
        destination,
        destinationObj;

    for (handle in locations) {
        new V.Location(handle, locations[handle]); // location Ids can't use GUID system
    }

    // add move functions
    for (locationName in V.index.locations) {
        locationObj = V.index.locations[locationName];
        for (direction in locationObj.exits) {
            destination = locationObj.exits[direction]; // string or function
            if (typeof destination == "function") {
                locationObj[direction] = destination.bind(locationObj);
            } else {
                destinationObj = V.findLocationByName(destination);
                if (!destinationObj) {
                    V.log("No destination '" + destination + "' exists", 'error');
                    continue;
                }

                // Would like to attach function <this room>.n = destination.goTo
                // however, destination is mutable so this doesn't work
                // The line below makes a version of the goTo function
                // with the current value of destination baked into it
                // see picoCreator's answer here: http://stackoverflow.com/questions/1833588/javascript-clone-a-function
                locationObj[direction] = destinationObj.goTo.bind(destinationObj);
            }
        }

    }
};
V.initializeAlignments = function (alignments) {
    var a;
    for (a in alignments) {
        new V.Alignment(alignments[a]);
    }
};
V.initializeRoles = function (roles) {
    var r;
    for (r in roles) {
        new V.Role(roles[r]);
    }
};
V.initializeCharacters = function(characters, alignments) {
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
    var i, text = "",
        thingCount = things.length;
    for (i=0; i < thingCount; i++) {
        if (i > 0 && i == thingCount - 1) {
            text += ", and "
        } else if (i > 0) {
            text += " and "
        }
        text += things[i].grammarName;
    }
    if (!thingCount) {
        text = V.messages.nothing;
    }
    return text;
};
V.getCharactersText = function(characters) {
    var i, text = "",
        charCount = characters.length;
    for (i=0; i < charCount; i++) {
        if (i > 0 && i == charCount - 1) {
            text += " and ";
        } else if (i > 0) {
            text += ", ";
        }
        text += characters[i].name;
    }
    return text;
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
V.Thing.prototype.examine = function(character) {
    character = character || V.PLAYER;
    if (this._isPresent(character)) {
        return this._getDescription();
        // thing methods may have side effects. If they return text,
        // it is handled in the default way for that game
    } else {
        return V.messages.notPresent;
    }
};
//V.Thing.prototype.look = V.Thing.prototype.lookAt = V.Thing.prototype.examine; // TODO: proper aliasing
V.Thing.prototype.destroy = function(character) {
    if (this._isPresent(character)) {
        if (this.breakable) {
            delete V.index.things[this.id];
        } else {
            return V.messages.unbreakable;
        }
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype._isPresent = function(character) {
    character = character || V.PLAYER;
    return (this.location == character.location || this.location == "inventory." + character.name);
};
V.Thing.prototype._nameOfCarrier = function() {
    if (this.location.indexOf("inventory") === 0) {
        return this.location.slice(10);
    } else {
        return null;
    }
};
V.Thing.prototype._getDescription = function() {
    var thingText;
    if (typeof this.description == 'function') {
        thingText = this.description.apply(this);
    } else {
        thingText = this.description ? this.description : '';
    }
    return thingText;
};
V.Thing.prototype.get = function(character) {
    character = character || V.PLAYER;

    if (this._isPresent(character)) {
        var whoHasIt = this._nameOfCarrier();
        if (whoHasIt == character.name) {
            return V.messages.alreadyHaveIt;
        } else if (whoHasIt) {
            return V.messages.genericImpossibleAction; // TODO - someone else has it
        } else {
            character.inventory.push(this);
            this.location = "inventory." + character.name;
            return V.messages.ok;
        }
    } else {
        return V.messages.notPresent;
    }
};
V.Thing.prototype.drop = function(character) {
    character = character || V.PLAYER;

    var whoHasIt = this._nameOfCarrier();
    if (whoHasIt == character.name) {
        character._removeFromInventory(this);
        return V.messages.ok;
    } else {
        return V.messages.notPresent;
    }
};

V.Location = function(id, o) {
    this.name = o.name;
    this.description = o.description;
    this.exits = o.exits;
    this.page = o.page;

    this.id = id;

    V.index.locations[this.id] = this;
};
V.Location.prototype._getDescription = function() {
    var locationText;
    if (typeof this.description == 'function') {
        locationText = this.description.apply(this);
    } else {
        locationText = this.description ? this.description : '';
    }
    return locationText;
};
V.Location.prototype._getEnterText = function() {
    var locationText = this._getDescription(),
        things = V.getThingsInLocation(this.name),
        characters = V.getCharactersInLocation(this.name);

    if (things && things.length) {
        locationText += V.messages.paragraphSeparator + V.messages.thingsInRoom1 +
            V.getThingsText(things) + '.';
    }
    if (characters && characters.length) {
        locationText += V.messages.paragraphSeparator + V.messages.charactersInRoom1
            + V.getCharactersText(characters) + (characters.length > 1 ? V.messages.charactersInRoom2plural : V.messages.charactersInRoom2singular);
    }
    return locationText;
};
V.Location.prototype._canMoveTo = function(destinationName) {
    var exits = this.exits,
        dir, dest;

    for (dir in exits) {
        dest = exits[dir];
        if (dest == destinationName) {
            return true;
        }
    }
    return false;
};
V.Location.prototype.goTo = function(characterObj, teleport) {
    characterObj = characterObj || V.PLAYER;

    // TODO: as this can be directly invoked, need to account for
    // referencing an unknown location

    if (characterObj.location == this.name) { // already there
        return V.messages.alreadyThere;
    }

    if (teleport || this._canMoveTo(characterObj.location)) {
        characterObj.location = this.name;
        if (this.page) {
            V.SCREENWindow.location.href = V.pagePath + this.page;
        }
        return this._getEnterText();
    } else {
        return V.messages.cantGoThatWay;
    }
};

V.Alignment = function(o) {
    this.name = o.name;
    this.grammarName = o.grammarName;
    V.alignments.push(this);
};

V.Role = function(o) {
    this.name = o.name;
    V.roles.push(this);
};
V.Role._cloneRoleList = function(filters) {
    var clone = [],
        i,
        role;
    for (i in V.roles) {
        role = V.roles[i];
        if (filters.indexOf(role.name) < 0) {
            clone.push(V.roles[i]);
        }
    }
    return clone;
};
V.Role._getRandom = function(filters) {
    var filteredClone = V.Role._cloneRoleList(filters),
        needle = Math.floor(filteredClone.length * Math.random());
    return filteredClone[needle];
};
V.Role._exists = function(roleName) {
    var j;
    for (j=0; j< V.roles.length; j++) {
        if (V.roles[j].name == roleName) {
            return true;
        }
    }
    return false;
};

/**
 * constructor for character object
 * @param o
 * @constructor
 *
 * o has form {
            description: "I probably look much the same as usual.",
            name: "Me",
            money: 20,
            personality: { // undefined types are randomized
                experience: 0,
                morality: 50 // player starts neutral but this is only perceptions of others
            },
            alignments: {
                leadership: 0,
                mafia: 0,
                rebels: 0
            },
            roles: ['colonist', 'r'],
            inventory: ['piano'] // atm this has to exist; constructor doesn't create it
   }
 *
 * All values out of 100, except money which is unbounded
 * random names not currently supported
 */
V.Character = function(o) {
    var prop, roleName, roleCount,
        alignmentName, aligmentVal, j,
        i, itemName, item,
        defaultPersonalityAttributes = {
            stealth: 'r',
            dexterity: 'r',
            charisma: 'r',
            stamina: 'r',
            morality: 'r',
            experience: 'r'
        };

    this.name = o.name;
    this.id = V.utils.getUniqueId(this.name);
    this.description = o.description;
    if (o.location == "r") { // random
        this.location = V.getRandomLocation();
    } else {
        this.location = o.location;
    }
    this.money = o.money || 0;

    if (V.alignments.length > 0) { // if alignments are used, initialize their values, default 0
        this.alignments = {};
        for (j=0; j< V.alignments.length; j++) {
            alignmentName = V.alignments[j].name;
            if (alignmentName) {
                aligmentVal = o.alignments && o.alignments[alignmentName] || 0;
                this.alignments[alignmentName] = aligmentVal;
            } else {
                V.log('an alignment must have a name', 'error');
            }
        }
    }

    if (V.roles.length > 0) { // o.roles is a list of role names
        roleCount = 0;
        this.roles = []; // list of role names
        for (j = 0; j< o.roles.length; j++) {
            roleName = o.roles[j];
            if (roleName == 'r') { // multiple random roles are supported
                roleCount++;
            } else if (V.Role._exists(roleName)) {
                this.roles.push(roleName);
            } else {
                V.log('nonexistent role: ' + roleName, 'error');
            }
        }
        if (roleCount) { // add random ones at the end
            for (j=0; j<roleCount; j++) {
                roleName = V.Role._getRandom(this.roles).name;
                this.roles.push(roleName);
            }
        }
    }

    this.personality = {};
    o.personality = $.extend(defaultPersonalityAttributes, o.personality);
    for (prop in o.personality) {
        if (o.personality[prop] == 'r') {
            this.personality[prop] = Math.floor(Math.random()*21);
        } else {
            this.personality[prop] = o.personality[prop];
        }
    }

    this.inventory = [];
    if (o.inventory) {
        for (i = 0; i < o.inventory.length; i++) {
            itemName = o.inventory[i];
            item = V.findThingsByName(itemName)[0];
            this.inventory.push(item);
            item.location = "inventory." + this.name;
        }
    }

    V.index.characters[this.id] = this;
};
V.Character.prototype.examine = function(whosLooking) {
    whosLooking = whosLooking || V.PLAYER;
    if (this._isPresent(whosLooking)) {
        return this._getDescription();
    } else {
        return V.messages.notPresent;
    }
};
V.Character.prototype._isPresent = function(who) {
    who = who || V.PLAYER;
    return (this.location == who.location);
};
V.Character.prototype._getDescription = function() {
    var characterText;
    if (typeof this.description == 'function') {
        characterText = this.description.apply(this);
    } else {
        characterText = this.description ? this.description : '';
    }
    return characterText;
};
V.Character.prototype._removeFromInventory = function(thingObj) {
    var inv = this.inventory,
        count = inv.length,
        where,
        item,
        j;

    for (j = 0; j < inv.length; j++) {
        item = inv[j];
        if (item.id === thingObj.id) {
            where = j;
            break;
        }
    }

    if (typeof where == 'undefined') {
        V.log(thingObj.name + " wasn't in the inventory of player " + this.name, 'error');
    } else {
        thingObj.location = this.location;
        if (where === 0) {
            this.inventory = inv.slice(1);
        } else if (where == count - 1) {
            this.inventory = inv.slice(0, count - 1);
        } else {
            this.inventory = inv.slice(0, where).concat(inv.slice(where + 1));
        }
    }
};
V.Character.prototype._addKnowledge = function (char, knowledgeObj, symmetrical) {
    V.addKnowledge(this.id, char.id, knowledgeObj);
    if (symmetrical) {
        V.addKnowledge(char.id, this.id, knowledgeObj);
    }
};
V.Character.prototype._knowledgeOf = function(char) {
    return V.getKnowledge(this.id, char.id);
};
V.Character.prototype._has = function(thingObj) {
    return thingObj._nameOfCarrier() == this.name;
};
V.Character.prototype.i = function () {
    var inventoryString;
    if (this.id == V.PLAYER.id) {
        inventoryString = V.messages.youHave + V.getThingsText(this.inventory);
    } else {
        inventoryString = V.messages.theyHave + V.getThingsText(this.inventory);
    }
    return inventoryString + '.';
};
/*V.Character.prototype._addToInventory = function(thingObj) {

};*/

/**
 * Make a bunch of minions with specified parameters
 * inventory not currently supported; should probably create items on fly
 * @param specification {object} same form of input to V.Character constructor
 *     except lists of possible values are also supported for everything other than roles
 * @param count {int} how many minions to make
 */
V.MinionFactory = function(specification, count) {
    var j, k,
        individualSpecification,
        individualPersonality,
        individualAlignments,
        personalityAttribute,
        alignmentName,
        minion,
        minions = [];

    count = count || 1;

    /*
        helper method to get an item from list of possibilities
        or return single value, or 'r' if none
    */
    function _extractRandomItem(arr) {
        if (typeof arr == 'object' ) { // peel one item out of array
            if (arr.length) {
                var needle = Math.floor(Math.random() * arr.length);
                return arr.splice(needle, 1)[0];
            } else {
                return 'r'; // run out of items
            }
        } else { // always return the singleton value (or undefined)
            return arr || 'r';
        }
    }

    for (j=1; j<=count; j++) {
        individualPersonality = {};
        for (k=0; k<V.personalityAttributes.length; k++) {
            personalityAttribute = V.personalityAttributes[k];
            individualPersonality[personalityAttribute] = specification.personality ?
                _extractRandomItem(specification.personality[personalityAttribute]) : 'r';
        }
        individualSpecification = {
            description: specification.description || V.messages.nothingSpecial,
            name: _extractRandomItem(specification.name),
            money: specification.money || 'r',
            personality : individualPersonality
        };

        if (V.roles) {
            individualSpecification.roles = specification.roles || ['r'];
            // it is expected that either all minions have the same role and/or random roles;
            // list of different sets of roles not supported
        }

        if (V.alignments) {
            individualAlignments = {};
            for (k=0; k<V.alignments.length; k++) {
                alignmentName = V.alignments[k];
                individualAlignments[alignmentName] = specification.alignments ?
                    _extractRandomItem(specification.alignments[alignmentName]) : 'r';
            }
        }

        minion = new V.Character(individualSpecification);
        minions.push(minion);
    }

    // make them all colleagues
    for (j=0; j<minions.length; j++) {
        for (k=0; k<j; k++) {
            minions[j]._addKnowledge(minions[k], { 'colleague' : true });
            minions[k]._addKnowledge(minions[j], { 'colleague' : true });
        }
    }

    return minions;
};

V.log = function(message, level) {
    level = level || 'log';
    if (V.debug) {
        console[level](message);
    }
};

V.messages = { // TODO: make overrides for this
    notPresent: "What are you talking about?",
    notCarried: "What are you talking about?",
    unknownItem: "What are you talking about?",
    unknownAction: "You can't do that. Now or possibly ever.",
    unknownActionToObject: "You want to do what to it?!",
    unbreakable: "Unbreakable, dammit!",
    cantGoThatWay: "You can't go that way.",
    genericImpossibleAction: "You can't",
    alreadyHaveIt: "You already have it",
    alreadyThere: "You do a pirhouette.",
    thingsInRoom1: "You can see ",
    thingsInRoom2: ".",
    charactersInRoom1: "",
    charactersInRoom2singular: " is here.",
    charactersInRoom2plural: " are here.",
    youHave: "You have ",
    theyHave: "They have ",
    nothing: "nothing",
    ok: "Okay.",
    nothingSpecial: "Nothing special",
    totallyConfused: "Nope. I got nothing. Sorry.",
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