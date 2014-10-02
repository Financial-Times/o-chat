/**
 * Pad number to 2 characters.
 * @param  {Number} number Number which should be pad to 2 characters.
 * @return {String|Number} The number in 2 characters.
 */
function padTo2 (number) {
    "use strict";

    if (number < 10) {
        return '0' + number;
    }
    return number;
}

var date = {
    /**
     * Converts a date in any format to a timestamp in milliseconds.
     * @param  {Date|String|Number} timestampOrDate Can be Date, string which is compatible with the constructor of Date, or a timestamp.
     * @return {Number} Timestamp in milliseconds
     */
    toTimestamp: function (timestampOrDate) {
        "use strict";
        
        if (timestampOrDate instanceof Date) {
            return timestampOrDate.getTime();
        }

        if (typeof timestampOrDate === "string") {
            return new Date(timestampOrDate).getTime();
        }

        if (timestampOrDate.toString().length < 13) {
            return timestampOrDate * 1000;
        } else {
            return timestampOrDate;
        }
    },

    /**
     * Converts a date in any format to a JS Date Object.
     * @param  {Date|String|Number} timestampOrDate Can be Date, string which is compatible with the constructor of Date, or a timestamp.
     * @return {Date} Date object
     */
    toDateObject: function (timestampOrDate) {
        "use strict";
        
        if (timestampOrDate instanceof Date) {
            return timestampOrDate;
        }

        return new Date(date.toTimestamp(timestampOrDate));
    },

    /**
     * Shim of Date.toISOString JS function for older browsers. Converts a date to the ISO format.
     * @param  {Date|String|Number} timestampOrDate Can be Date, string which is compatible with the constructor of Date, or a timestamp.
     * @return {String} Date in ISO format.
     */
    toISOString: function (timestampOrDate) {
        "use strict";

        var dateObj = date.toDateObject(timestampOrDate);

        if (dateObj.hasOwnProperty('toISOString')) {
            return dateObj.toISOString();
        } else {
            return dateObj.getUTCFullYear() +
                '-' + padTo2(dateObj.getUTCMonth() + 1) +
                '-' + padTo2(dateObj.getUTCDate()) +
                'T' + padTo2(dateObj.getUTCHours()) +
                ':' + padTo2(dateObj.getUTCMinutes()) +
                ':' + padTo2(dateObj.getUTCSeconds()) +
                '.' + (dateObj.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
                'Z';
        }
    }
};
exports.date = date;


var strings = {
    /**
     * Shim of String.trim for older browsers. Trims a string.
     * @param  {String} string String to be trimmed.
     * @return {String} Trimmed string
     */
    trim: function (string) {
        "use strict";
        
        if (String.prototype.trim) {
            return string.trim();
        } else {
            return string.replace(/^\s+|\s+$/g, '');
        }
    }
};
exports.strings = strings;