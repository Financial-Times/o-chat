function padForToISOStringShim (number) {
    "use strict";

    if (number < 10) {
        return '0' + number;
    }
    return number;
}

var date = {
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

    toDateObject: function (timestampOrDate) {
        "use strict";
        
        if (timestampOrDate instanceof Date) {
            return timestampOrDate;
        }

        return new Date(date.toTimestamp(timestampOrDate));
    },

    toISOString: function (timestampOrDate) {
        "use strict";

        var dateObj = date.toDateObject(timestampOrDate);

        if (dateObj.hasOwnProperty('toISOString')) {
            return dateObj.toISOString();
        } else {
            return dateObj.getUTCFullYear() +
                '-' + padForToISOStringShim(dateObj.getUTCMonth() + 1) +
                '-' + padForToISOStringShim(dateObj.getUTCDate()) +
                'T' + padForToISOStringShim(dateObj.getUTCHours()) +
                ':' + padForToISOStringShim(dateObj.getUTCMinutes()) +
                ':' + padForToISOStringShim(dateObj.getUTCSeconds()) +
                '.' + (dateObj.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
                'Z';
        }
    }
};
exports.date = date;


var strings = {
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