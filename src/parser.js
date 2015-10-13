exports.soundString = function(data) {
    //            0    1    2    3    4     5     6     7     8
    //var scale = ['1', '2', '3', '4', '5-', '5+', '6-', '6+', '7'];

    //if (data.revision == 1) return 'nhk-alert';
    if (data.type == 1 || data.situation == 2) return 'simple';
    // else if (scale.indexOf(data.seismic_en) >= 4) return 'keitai';
    else return 'nhk';
};

exports.situationString = function(data, locale, lang) {
    if (data.situation == 1) return locale[lang].units.final;
    else return '#' + data.revision;
};

exports.template = function(data, locale, lang) {
    if (data.type == 1 || data.situation == 2) return ['', locale[lang].cancelled];
    else {
        var message_template = locale[lang].units.magnitude + ': ' + data.magnitude + ', ' + locale[lang].units.seismic + ': ' + data.seismic_en;
        if (lang == 'ja') return [data.epicenter_ja, message_template];
        else return [data.epicenter_en, message_template];
    }
};
