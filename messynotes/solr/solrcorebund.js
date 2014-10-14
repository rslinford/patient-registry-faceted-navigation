/**
 * Created by rslinford on 10/12/14.
 */
AjaxSolr = function () {
};
AjaxSolr.Class = function () {
};
AjaxSolr.Class.extend = function (properties) {
    var klass = this;
    var subClass = function (options) {
        AjaxSolr.extend(this, new klass(options), properties, options);
    }
    subClass.extend = this.extend;
    return subClass;
};
AjaxSolr.size = function (obj) {
    var size = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};
AjaxSolr.equals = function (foo, bar) {
    if (AjaxSolr.isArray(foo) && AjaxSolr.isArray(bar)) {
        if (foo.length !== bar.length) {
            return false;
        }
        for (var i = 0, l = foo.length; i < l; i++) {
            if (foo[i] !== bar[i]) {
                return false;
            }
        }
        return true;
    }
    else if (AjaxSolr.isRegExp(foo) && AjaxSolr.isString(bar)) {
        return bar.match(foo);
    }
    else if (AjaxSolr.isRegExp(bar) && AjaxSolr.isString(foo)) {
        return foo.match(bar);
    }
    else {
        return foo === bar;
    }
};
AjaxSolr.inArray = function (value, array) {
    if (array) {
        for (var i = 0, l = array.length; i < l; i++) {
            if (AjaxSolr.equals(array[i], value)) {
                return i;
            }
        }
    }
    return -1;
};
AjaxSolr.flatten = function (array) {
    var ret = [];
    for (var i = 0, l = array.length; i < l; i++) {
        ret = ret.concat(AjaxSolr.isArray(array[i]) ? AjaxSolr.flatten(array[i]) : array[i]);
    }
    return ret;
};
AjaxSolr.grep = function (array, callback) {
    var ret = [];
    for (var i = 0, l = array.length; i < l; i++) {
        if (!callback(array[i], i) === false) {
            ret.push(array[i]);
        }
    }
    return ret;
}
AjaxSolr.compact = function (array) {
    return AjaxSolr.grep(array, function (item) {
        return item.toString();
    });
}
AjaxSolr.isArray = function (obj) {
    return obj != null && typeof obj == 'object' && 'splice'in obj && 'join'in obj;
};
AjaxSolr.isRegExp = function (obj) {
    return obj != null && (typeof obj == 'object' || typeof obj == 'function') && 'ignoreCase'in obj;
};
AjaxSolr.isString = function (obj) {
    return obj != null && typeof obj == 'string';
};
AjaxSolr.theme = function (func) {
    if (AjaxSolr.theme[func] || AjaxSolr.theme.prototype[func] == undefined) {
        console.log('Theme function "' + func + '" is not defined.');
    }
    else {
        for (var i = 1, args = []; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return (AjaxSolr.theme[func] || AjaxSolr.theme.prototype[func]).apply(this, args);
    }
};
AjaxSolr.extend = function () {
    var target = arguments[0] || {}, i = 1, length = arguments.length, options;
    for (; i < length; i++) {
        if ((options = arguments[i]) != null) {
            for (var name in options) {
                var src = target[name], copy = options[name];
                if (target === copy) {
                    continue;
                }
                if (copy && typeof copy == 'object' && !copy.nodeType) {
                    target[name] = AjaxSolr.extend(src || (copy.length != null ? [] : {}), copy);
                }
                else if (copy && src && typeof copy == 'function' && typeof src == 'function') {
                    target[name] = (function (superfn, fn) {
                        return function () {
                            var tmp = this._super, ret;
                            this._super = superfn;
                            ret = fn.apply(this, arguments);
                            this._super = tmp;
                            return ret;
                        };
                    })(src, copy);
                }
                else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }
    return target;
};
AjaxSolr.AbstractManager = AjaxSolr.Class.extend({
    solrUrl: 'http://localhost:8983/solr/',
    proxyUrl: null,
    servlet: 'select',
    response: {},
    widgets: {},
    store: null,
    initialized: false,
    init: function () {
        this.initialized = true;
        if (this.store === null) {
            this.setStore(new AjaxSolr.ParameterStore());
        }
        this.store.load(false);
        for (var widgetId in this.widgets) {
            this.widgets[widgetId].init();
        }
        this.store.init();
    },
    setStore: function (store) {
        store.manager = this;
        this.store = store;
    },
    addWidget: function (widget) {
        widget.manager = this;
        this.widgets[widget.id] = widget;
    },
    doRequest: function (start, servlet, save_state, is_init) {
        if (this.initialized === false) {
            this.init();
        }
        if (start !== undefined) {
            this.store.get('start').val(start);
        }
        if (servlet === undefined) {
            servlet = this.servlet;
        }
        save_state = (save_state === undefined) ? false : save_state;
        is_init = (is_init === undefined) ? false : is_init;
        if (save_state) {
            this.store.save(is_init);
        } else {
            for (var widgetId in this.widgets) {
                this.widgets[widgetId].beforeRequest();
            }
            this.executeRequest(servlet);
        }
    },
    executeRequest: function (servlet) {
        throw'Abstract method executeRequest must be overridden in a subclass.';
    },
    handleResponse: function (data) {
        this.response = data;
        for (var widgetId in this.widgets) {
            this.widgets[widgetId].afterRequest();
        }
    },
    handleError: function (jqXHR, textStatus, errorThrown) {
        for (var widgetId in this.widgets) {
            this.widgets[widgetId].onRequestError(jqXHR, textStatus, errorThrown);
        }
    }
});
AjaxSolr.Manager = AjaxSolr.AbstractManager.extend({
    executeRequest: function (servlet) {
        var self = this;
        if (this.proxyUrl) {
            jQuery.post(this.proxyUrl, {query: this.store.string()}, function (data) {
                self.handleResponse(data);
            }, 'json');
        }
        else {
            jQuery.getJSON(this.solrUrl + servlet + '?' + this.store.string() + '&wt=json', {}, function (data) {
                self.handleResponse(data);
            }).error(function (jqXHR, textStatus, errorThrown) {
                self.handleError(jqXHR, textStatus, errorThrown);
            });
        }
    }
});
AjaxSolr.Parameter = AjaxSolr.Class.extend({
    name: null, value: null, locals: {}, val: function (value) {
        if (value === undefined) {
            return this.value;
        }
        else {
            this.value = value;
        }
    }, local: function (name, value) {
        if (value === undefined) {
            return this.locals[name];
        }
        else {
            this.locals[name] = value;
        }
    }, remove: function (name) {
        delete this.locals[name];
    }, string: function () {
        var pairs = [];
        for (var name in this.locals) {
            if (this.locals[name]) {
                pairs.push(name + '=' + encodeURIComponent(this.locals[name]));
            }
        }
        var prefix = pairs.length ? '{!' + pairs.join('%20') + '}' : '';
        if (this.value) {
            return this.name + '=' + prefix + this.valueString(this.value);
        }
        else if (this.name == 'q' && prefix) {
            return 'q.alt=' + prefix + encodeURIComponent('*:*');
        }
        else {
            return '';
        }
    }, parseString: function (str) {
        var param = str.match(/^([^=]+)=(?:\{!([^\}]*)\})?(.*)$/);
        if (param) {
            var matches;
            while (matches = /([^\s=]+)=(\S*)/g.exec(decodeURIComponent(param[2]))) {
                this.locals[matches[1]] = decodeURIComponent(matches[2]);
                param[2] = param[2].replace(matches[0], '');
            }
            if (param[1] == 'q.alt') {
                this.name = 'q';
            }
            else {
                this.name = param[1];
                this.value = this.parseValueString(param[3]);
            }
        }
    }, valueString: function (value) {
        value = AjaxSolr.isArray(value) ? value.join(',') : value;
        return encodeURIComponent(value);
    }, parseValueString: function (str) {
        str = decodeURIComponent(str);
        return str.indexOf(',') == -1 ? str : str.split(',');
    }
});
AjaxSolr.Parameter.escapeValue = function (value) {
    if (value.match(/[ :]/) && !value.match(/[\[\{]\S+ TO \S+[\]\}]/) && !value.match(/^["\(].*["\)]$/)) {
        return '"' + value + '"';
    }
    return value;
}
AjaxSolr.ParameterStore = AjaxSolr.Class.extend({
    exposed: [], params: {}, manager: null, init: function () {
    }, isMultiple: function (name) {
        return name.match(/^(?:bf|bq|facet\.date|facet\.date\.other|facet\.date\.include|facet\.field|facet\.pivot|facet\.range|facet\.range\.other|facet\.range\.include|facet\.query|fq|group\.field|group\.func|group\.query|pf|qf)$/);
    }, get: function (name) {
        if (this.params[name] === undefined) {
            var param = new AjaxSolr.Parameter({name: name});
            if (this.isMultiple(name)) {
                this.params[name] = [param];
            }
            else {
                this.params[name] = param;
            }
        }
        return this.params[name];
    }, values: function (name) {
        if (this.params[name] !== undefined) {
            if (this.isMultiple(name)) {
                var values = [];
                for (var i = 0, l = this.params[name].length; i < l; i++) {
                    values.push(this.params[name][i].val());
                }
                return values;
            }
            else {
                return [this.params[name].val()];
            }
        }
        return [];
    }, add: function (name, param) {
        if (param === undefined) {
            param = new AjaxSolr.Parameter({name: name});
        }
        if (this.isMultiple(name)) {
            if (this.params[name] === undefined) {
                this.params[name] = [param];
            }
            else {
                if (AjaxSolr.inArray(param.val(), this.values(name)) == -1) {
                    this.params[name].push(param);
                }
                else {
                    return false;
                }
            }
        }
        else {
            this.params[name] = param;
        }
        return param;
    }, remove: function (name, index) {
        if (index === undefined) {
            delete this.params[name];
        }
        else {
            this.params[name].splice(index, 1);
            if (this.params[name].length == 0) {
                delete this.params[name];
            }
        }
    }, find: function (name, value) {
        if (this.params[name] !== undefined) {
            if (this.isMultiple(name)) {
                var indices = [];
                for (var i = 0, l = this.params[name].length; i < l; i++) {
                    if (AjaxSolr.equals(this.params[name][i].val(), value)) {
                        indices.push(i);
                    }
                }
                return indices.length ? indices : false;
            }
            else {
                if (AjaxSolr.equals(this.params[name].val(), value)) {
                    return name;
                }
            }
        }
        return false;
    }, addByValue: function (name, value) {
        if (this.isMultiple(name) && AjaxSolr.isArray(value)) {
            var ret = [];
            for (var i = 0, l = value.length; i < l; i++) {
                ret.push(this.add(name, new AjaxSolr.Parameter({name: name, value: value[i]})));
            }
            return ret;
        }
        else {
            return this.add(name, new AjaxSolr.Parameter({name: name, value: value}))
        }
    }, removeByValue: function (name, value) {
        var indices = this.find(name, value);
        if (indices) {
            if (AjaxSolr.isArray(indices)) {
                for (var i = indices.length - 1; i >= 0; i--) {
                    this.remove(name, indices[i]);
                }
            }
            else {
                this.remove(indices);
            }
        }
        return indices;
    }, string: function () {
        var params = [];
        for (var name in this.params) {
            if (this.isMultiple(name)) {
                for (var i = 0, l = this.params[name].length; i < l; i++) {
                    params.push(this.params[name][i].string());
                }
            }
            else {
                params.push(this.params[name].string());
            }
        }
        return AjaxSolr.compact(params).join('&');
    }, stringExport: function (options) {
        var params = [];
        for (var name in this.params) {
            if (name === "fq" || name === "q") {
                if (this.isMultiple(name)) {
                    for (var i = 0, l = this.params[name].length; i < l; i++) {
                        params.push(this.params[name][i].string());
                    }
                }
                else {
                    params.push(this.params[name].string());
                }
            }
        }
        for (name in options) {
            params.push(name + "=" + encodeURIComponent(options[name]));
        }
        return AjaxSolr.compact(params).join('&');
    }, parseString: function (str) {
        var pairs = str.split('&');
        for (var i = 0, l = pairs.length; i < l; i++) {
            if (pairs[i]) {
                var param = new AjaxSolr.Parameter();
                param.parseString(pairs[i]);
                this.add(param.name, param);
            }
        }
    }, exposedString: function (is_init) {
        var params = [];
        for (var i = 0, l = this.exposed.length; i < l; i++) {
            if (this.params[this.exposed[i]] !== undefined) {
                if (this.isMultiple(this.exposed[i])) {
                    for (var j = 0, m = this.params[this.exposed[i]].length; j < m; j++) {
                        params.push(this.roprfy(this.params[this.exposed[i]][j].string()));
                    }
                }
                else {
                    params.push(this.roprfy(this.params[this.exposed[i]].string()));
                }
            }
        }
        params.push("init=" + is_init);
        return AjaxSolr.compact(params).join('&');
    }, roprfy: function (param_string) {
        var index = param_string.indexOf('fq='), param_array = param_string.split("%3A"), value, dateArray, prop, fragment = "", key;
        if (index !== -1) {
            key = param_array.shift().substr(index + 3);
            if (key === "dateEntry" || key === "dateUpdate") {
                dateArray = roprUtil.dates[(key === "dateUpdate") ? "dateUpdated" : "dateEntry"].getPartialDates();
                for (var i = 0; i < dateArray.length; i++) {
                    if (dateArray[i].value) {
                        fragment += dateArray[i].key + "=" + dateArray[i].value + "&";
                    }
                }
                return fragment.substring(0, fragment.length - 1);
            }
            value = param_array.join(":");
            return key + "=" + value;
        } else {
            return param_string;
        }
    }, exposedReset: function () {
        for (var i = 0, l = this.exposed.length; i < l; i++) {
            this.remove(this.exposed[i]);
        }
    }, load: function (reset) {
        if (reset === undefined) {
            reset = true;
        }
        if (reset) {
            this.exposedReset();
        }
        this.parseString(this.storedString());
    }, save: function () {
    }, storedString: function () {
        return '';
    }
});
AjaxSolr.AbstractWidget = AjaxSolr.Class.extend({
    id: null, target: null, manager: null, init: function () {
    }, beforeRequest: function () {
    }, afterRequest: function () {
    }, onRequestError: function (jqXHR, textStatus, errorThrown) {
    }
});
AjaxSolr.AbstractFacetWidget = AjaxSolr.AbstractWidget.extend({
    field: null, multivalue: true, init: function () {
        this.initStore();
    }, initStore: function () {
        var parameters = ['facet.prefix', 'facet.sort', 'facet.limit', 'facet.offset', 'facet.mincount', 'facet.missing', 'facet.method', 'facet.enum.cache.minDf'];
        this.manager.store.addByValue('facet', true);
        if (this['facet.field'] !== undefined) {
            this.manager.store.addByValue('facet.field', this.field);
        }
        else if (this['facet.date'] !== undefined) {
            this.manager.store.addByValue('facet.date', this.field);
            parameters = parameters.concat(['facet.date.start', 'facet.date.end', 'facet.date.gap', 'facet.date.hardend', 'facet.date.other', 'facet.date.include']);
        }
        else if (this['facet.range'] !== undefined) {
            this.manager.store.addByValue('facet.range', this.field);
            parameters = parameters.concat(['facet.range.start', 'facet.range.end', 'facet.range.gap', 'facet.range.hardend', 'facet.range.other', 'facet.range.include']);
        }
        for (var i = 0, l = parameters.length; i < l; i++) {
            if (this[parameters[i]] !== undefined) {
                this.manager.store.addByValue('f.' + this.field + '.' + parameters[i], this[parameters[i]]);
            }
        }
    }, isEmpty: function () {
        return !this.manager.store.find('fq', new RegExp('^-?' + this.field + ':'));
    }, set: function (value) {
        return this.changeSelection(function () {
            var a = this.manager.store.removeByValue('fq', new RegExp('^-?' + this.field + ':')), b = this.manager.store.addByValue('fq', this.fq(value));
            return a || b;
        });
    }, add: function (value) {
        return this.changeSelection(function () {
            return this.manager.store.addByValue('fq', this.fq(value));
        });
    }, remove: function (value) {
        return this.changeSelection(function () {
            return this.manager.store.removeByValue('fq', this.fq(value));
        });
    }, clear: function () {
        return this.changeSelection(function () {
            return this.manager.store.removeByValue('fq', new RegExp('^-?' + this.field + ':'));
        });
    }, changeSelection: function (func) {
        changed = func.apply(this);
        if (changed) {
            this.afterChangeSelection();
        }
        return changed;
    }, afterChangeSelection: function () {
    }, getFacetCounts: function () {
        var property;
        if (this['facet.field'] !== undefined) {
            property = 'facet_fields';
        }
        else if (this['facet.date'] !== undefined) {
            property = 'facet_dates';
        }
        else if (this['facet.range'] !== undefined) {
            property = 'facet_ranges';
        }
        if (property !== undefined) {
            switch (this.manager.store.get('json.nl').val()) {
                case'map':
                    return this.getFacetCountsMap(property);
                case'arrarr':
                    return this.getFacetCountsArrarr(property);
                default:
                    return this.getFacetCountsFlat(property);
            }
        }
        throw'Cannot get facet counts unless one of the following properties is set to "true" on widget "' + this.id + '": "facet.field", "facet.date", or "facet.range".';
    }, getFacetCountsMap: function (property) {
        var counts = [];
        for (var facet in this.manager.response.facet_counts[property][this.field]) {
            counts.push({
                facet: facet,
                count: parseInt(this.manager.response.facet_counts[property][this.field][facet])
            });
        }
        return counts;
    }, getFacetCountsArrarr: function (property) {
        var counts = [];
        for (var i = 0, l = this.manager.response.facet_counts[property][this.field].length; i < l; i++) {
            counts.push({
                facet: this.manager.response.facet_counts[property][this.field][i][0],
                count: parseInt(this.manager.response.facet_counts[property][this.field][i][1])
            });
        }
        return counts;
    }, getFacetCountsFlat: function (property) {
        var counts = [];
        for (var i = 0, l = this.manager.response.facet_counts[property][this.field].length; i < l; i += 2) {
            counts.push({
                facet: this.manager.response.facet_counts[property][this.field][i],
                count: parseInt(this.manager.response.facet_counts[property][this.field][i + 1])
            });
        }
        return counts;
    }, clickHandler: function (value) {
        var self = this, meth = this.multivalue ? 'add' : 'set';
        return function () {
            if (self[meth].call(self, value)) {
                self.manager.doRequest(0);
            }
            return false;
        }
    }, unclickHandler: function (value) {
        var self = this;
        return function () {
            if (self.remove(value)) {
                self.manager.doRequest(0);
            }
            return false;
        }
    }, fq: function (value, exclude) {
        return (exclude ? '-' : '') + this.field + ':' + AjaxSolr.Parameter.escapeValue(value);
    }
});