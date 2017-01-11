"use strict";
var V = {};

V.init = function(params) {

};

V.index = {
    things: {},
    locations: {},
    characters: {}
};

/**
 * Search the index for items matching the property values provided in params
 * @param type
 * @param params
 */
V.genericSearch = function(params, type) {
    type = type || 'things';
    var index = V.index[type],
        key, searchTarget, criterion,
        results = [];
        //keys = Object.keys(index);

    for (key in index) {
        searchTarget = index[key];
        for (criterion in params) {
            if (searchTarget[criterion] && searchTarget[criterion] === params[criterion]) {
                results.push(searchTarget);
            }
        }
    }
};


V.Thing = function(o) {
    this.name = o.name;
    this.description = o.description;
    // description might be a function that figures out what the text description should be, based on state of thing
    // in that case, thing is passed in as only param

    this.hidden = o.hidden || false;

    // add to thing index
    this.id = V.utils.camelCaseify(this.name) + '-' + V.utils.getTimestamp();
    V.index.things[this.id] = this;
};
V.Thing.prototype.lookAt = function() {
    var descString;
    if (typeof this.description == 'string') {
        descString = this.description;
    } else if (typeof this.description == 'function') {
        descString = this.description(this);
    }
    return descString; // thing methods may have side effects. If they return text, it is handled in the default way for that game
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
    }
};