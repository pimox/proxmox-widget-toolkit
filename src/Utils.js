Ext.ns('Proxmox');
Ext.ns('Proxmox.Setup');

if (!Ext.isDefined(Proxmox.Setup.auth_cookie_name)) {
    throw "Proxmox library not initialized";
}

// avoid errors when running without development tools
if (!Ext.isDefined(Ext.global.console)) {
    let console = {
	dir: function() {
	    // do nothing
	},
	log: function() {
	    // do nothing
	},
	warn: function() {
	    // do nothing
	},
    };
    Ext.global.console = console;
}

Ext.Ajax.defaultHeaders = {
    'Accept': 'application/json',
};

Ext.Ajax.on('beforerequest', function(conn, options) {
    if (Proxmox.CSRFPreventionToken) {
	if (!options.headers) {
	    options.headers = {};
	}
	options.headers.CSRFPreventionToken = Proxmox.CSRFPreventionToken;
    }
    let storedAuth = Proxmox.Utils.getStoredAuth();
    if (storedAuth.token) {
	options.headers.Authorization = storedAuth.token;
    }
});

Ext.define('Proxmox.Utils', { // a singleton
utilities: {

    yesText: gettext('Yes'),
    noText: gettext('No'),
    enabledText: gettext('Enabled'),
    disabledText: gettext('Disabled'),
    noneText: gettext('none'),
    NoneText: gettext('None'),
    errorText: gettext('Error'),
    warningsText: gettext('Warnings'),
    unknownText: gettext('Unknown'),
    defaultText: gettext('Default'),
    daysText: gettext('days'),
    dayText: gettext('day'),
    runningText: gettext('running'),
    stoppedText: gettext('stopped'),
    neverText: gettext('never'),
    totalText: gettext('Total'),
    usedText: gettext('Used'),
    directoryText: gettext('Directory'),
    stateText: gettext('State'),
    groupText: gettext('Group'),

    language_map: {
	ar: 'Arabic',
	ca: 'Catalan',
	zh_CN: 'Chinese (Simplified)',
	zh_TW: 'Chinese (Traditional)',
	da: 'Danish',
	nl: 'Dutch',
	en: 'English',
	eu: 'Euskera (Basque)',
	fr: 'French',
	de: 'German',
	he: 'Hebrew',
	it: 'Italian',
	ja: 'Japanese',
	kr: 'Korean',
	nb: 'Norwegian (Bokmal)',
	nn: 'Norwegian (Nynorsk)',
	fa: 'Persian (Farsi)',
	pl: 'Polish',
	pt_BR: 'Portuguese (Brazil)',
	ru: 'Russian',
	sl: 'Slovenian',
	es: 'Spanish',
	sv: 'Swedish',
	tr: 'Turkish',
    },

    render_language: function(value) {
	if (!value) {
	    return Proxmox.Utils.defaultText + ' (English)';
	}
	let text = Proxmox.Utils.language_map[value];
	if (text) {
	    return text + ' (' + value + ')';
	}
	return value;
    },

    language_array: function() {
	let data = [['__default__', Proxmox.Utils.render_language('')]];
	Ext.Object.each(Proxmox.Utils.language_map, function(key, value) {
	    data.push([key, Proxmox.Utils.render_language(value)]);
	});

	return data;
    },

    bond_mode_gettext_map: {
	'802.3ad': 'LACP (802.3ad)',
	'lacp-balance-slb': 'LACP (balance-slb)',
	'lacp-balance-tcp': 'LACP (balance-tcp)',
    },

    render_bond_mode: value => Proxmox.Utils.bond_mode_gettext_map[value] || value || '',

    bond_mode_array: function(modes) {
	return modes.map(mode => [mode, Proxmox.Utils.render_bond_mode(mode)]);
    },

    getNoSubKeyHtml: function(url) {
	// url http://www.proxmox.com/products/proxmox-ve/subscription-service-plans
	return Ext.String.format('You do not have a valid subscription for this server. Please visit <a target="_blank" href="{0}">www.proxmox.com</a> to get a list of available options.', url || 'https://www.proxmox.com');
    },

    format_boolean_with_default: function(value) {
	if (Ext.isDefined(value) && value !== '__default__') {
	    return value ? Proxmox.Utils.yesText : Proxmox.Utils.noText;
	}
	return Proxmox.Utils.defaultText;
    },

    format_boolean: function(value) {
	return value ? Proxmox.Utils.yesText : Proxmox.Utils.noText;
    },

    format_neg_boolean: function(value) {
	return !value ? Proxmox.Utils.yesText : Proxmox.Utils.noText;
    },

    format_enabled_toggle: function(value) {
	return value ? Proxmox.Utils.enabledText : Proxmox.Utils.disabledText;
    },

    format_expire: function(date) {
	if (!date) {
	    return Proxmox.Utils.neverText;
	}
	return Ext.Date.format(date, "Y-m-d");
    },

    // somewhat like a human would tell durations, omit zero values and do not
    // give seconds precision if we talk days already
    format_duration_human: function(ut) {
	let seconds = 0, minutes = 0, hours = 0, days = 0;

	if (ut <= 0.1) {
	    return '<0.1s';
	}

	let remaining = ut;
	seconds = Number((remaining % 60).toFixed(1));
	remaining = Math.trunc(remaining / 60);
	if (remaining > 0) {
	    minutes = remaining % 60;
	    remaining = Math.trunc(remaining / 60);
	    if (remaining > 0) {
		hours = remaining % 24;
		remaining = Math.trunc(remaining / 24);
		if (remaining > 0) {
		    days = remaining;
		}
	    }
	}

	let res = [];
	let add = (t, unit) => {
	    if (t > 0) res.push(t + unit);
	    return t > 0;
	};

	let addSeconds = !add(days, 'd');
	add(hours, 'h');
	add(minutes, 'm');
	if (addSeconds) {
	    add(seconds, 's');
	}
	return res.join(' ');
    },

    format_duration_long: function(ut) {
	let days = Math.floor(ut / 86400);
	ut -= days*86400;
	let hours = Math.floor(ut / 3600);
	ut -= hours*3600;
	let mins = Math.floor(ut / 60);
	ut -= mins*60;

	let hours_str = '00' + hours.toString();
	hours_str = hours_str.substr(hours_str.length - 2);
	let mins_str = "00" + mins.toString();
	mins_str = mins_str.substr(mins_str.length - 2);
	let ut_str = "00" + ut.toString();
	ut_str = ut_str.substr(ut_str.length - 2);

	if (days) {
	    let ds = days > 1 ? Proxmox.Utils.daysText : Proxmox.Utils.dayText;
	    return days.toString() + ' ' + ds + ' ' +
		hours_str + ':' + mins_str + ':' + ut_str;
	} else {
	    return hours_str + ':' + mins_str + ':' + ut_str;
	}
    },

    format_subscription_level: function(level) {
	if (level === 'c') {
	    return 'Community';
	} else if (level === 'b') {
	    return 'Basic';
	} else if (level === 's') {
	    return 'Standard';
	} else if (level === 'p') {
	    return 'Premium';
	} else {
	    return Proxmox.Utils.noneText;
	}
    },

    compute_min_label_width: function(text, width) {
	if (width === undefined) { width = 100; }

	let tm = new Ext.util.TextMetrics();
	let min = tm.getWidth(text + ':');

	return min < width ? width : min;
    },

    getStoredAuth: function() {
	let storedAuth = JSON.parse(window.localStorage.getItem('ProxmoxUser'));
	return storedAuth || {};
    },

    setAuthData: function(data) {
	Proxmox.UserName = data.username;
	Proxmox.LoggedOut = data.LoggedOut;
	// creates a session cookie (expire = null)
	// that way the cookie gets deleted after the browser window is closed
	if (data.ticket) {
	    Proxmox.CSRFPreventionToken = data.CSRFPreventionToken;
	    Ext.util.Cookies.set(Proxmox.Setup.auth_cookie_name, data.ticket, null, '/', null, true);
	}

	if (data.token) {
	    window.localStorage.setItem('ProxmoxUser', JSON.stringify(data));
	}
    },

    authOK: function() {
	if (Proxmox.LoggedOut) {
	    return undefined;
	}
	let storedAuth = Proxmox.Utils.getStoredAuth();
	let cookie = Ext.util.Cookies.get(Proxmox.Setup.auth_cookie_name);
	if ((Proxmox.UserName !== '' && cookie && !cookie.startsWith("PVE:tfa!")) || storedAuth.token) {
	    return cookie || storedAuth.token;
	} else {
	    return false;
	}
    },

    authClear: function() {
	if (Proxmox.LoggedOut) {
	    return;
	}
	Ext.util.Cookies.clear(Proxmox.Setup.auth_cookie_name);
	window.localStorage.removeItem("ProxmoxUser");
    },

    // comp.setLoading() is buggy in ExtJS 4.0.7, so we
    // use el.mask() instead
    setErrorMask: function(comp, msg) {
	let el = comp.el;
	if (!el) {
	    return;
	}
	if (!msg) {
	    el.unmask();
	} else if (msg === true) {
	    el.mask(gettext("Loading..."));
	} else {
	    el.mask(msg);
	}
    },

    getResponseErrorMessage: (err) => {
	if (!err.statusText) {
	    return gettext('Connection error');
	}
	let msg = [`${err.statusText} (${err.status})`];
	if (err.response && err.response.responseText) {
	    let txt = err.response.responseText;
	    try {
		let res = JSON.parse(txt);
		if (res.errors && typeof res.errors === 'object') {
		    for (let [key, value] of Object.entries(res.errors)) {
			msg.push(Ext.String.htmlEncode(`${key}: ${value}`));
		    }
		}
	    } catch (e) {
		// fallback to string
		msg.push(Ext.String.htmlEncode(txt));
	    }
	}
	return msg.join('<br>');
    },

    monStoreErrors: function(component, store, clearMaskBeforeLoad, errorCallback) {
	if (clearMaskBeforeLoad) {
	    component.mon(store, 'beforeload', function(s, operation, eOpts) {
		Proxmox.Utils.setErrorMask(component, false);
	    });
	} else {
	    component.mon(store, 'beforeload', function(s, operation, eOpts) {
		if (!component.loadCount) {
		    component.loadCount = 0; // make sure it is nucomponent.ic
		    Proxmox.Utils.setErrorMask(component, true);
		}
	    });
	}

	// only works with 'proxmox' proxy
	component.mon(store.proxy, 'afterload', function(proxy, request, success) {
	    component.loadCount++;

	    if (success) {
		Proxmox.Utils.setErrorMask(component, false);
		return;
	    }

	    let error = request._operation.getError();
	    let msg = Proxmox.Utils.getResponseErrorMessage(error);
	    if (!errorCallback || !errorCallback(error, msg)) {
		Proxmox.Utils.setErrorMask(component, msg);
	    }
	});
    },

    extractRequestError: function(result, verbose) {
	let msg = gettext('Successful');

	if (!result.success) {
	    msg = gettext("Unknown error");
	    if (result.message) {
		msg = result.message;
		if (result.status) {
		    msg += ' (' + result.status + ')';
		}
	    }
	    if (verbose && Ext.isObject(result.errors)) {
		msg += "<br>";
		Ext.Object.each(result.errors, function(prop, desc) {
		    msg += "<br><b>" + Ext.htmlEncode(prop) + "</b>: " +
			Ext.htmlEncode(desc);
		});
	    }
	}

	return msg;
    },

    // Ext.Ajax.request
    API2Request: function(reqOpts) {
	let newopts = Ext.apply({
	    waitMsg: gettext('Please wait...'),
	}, reqOpts);

	if (!newopts.url.match(/^\/api2/)) {
	    newopts.url = '/api2/extjs' + newopts.url;
	}
	delete newopts.callback;

	let createWrapper = function(successFn, callbackFn, failureFn) {
	    Ext.apply(newopts, {
		success: function(response, options) {
		    if (options.waitMsgTarget) {
			if (Proxmox.Utils.toolkit === 'touch') {
			    options.waitMsgTarget.setMasked(false);
			} else {
			    options.waitMsgTarget.setLoading(false);
			}
		    }
		    let result = Ext.decode(response.responseText);
		    response.result = result;
		    if (!result.success) {
			response.htmlStatus = Proxmox.Utils.extractRequestError(result, true);
			Ext.callback(callbackFn, options.scope, [options, false, response]);
			Ext.callback(failureFn, options.scope, [response, options]);
			return;
		    }
		    Ext.callback(callbackFn, options.scope, [options, true, response]);
		    Ext.callback(successFn, options.scope, [response, options]);
		},
		failure: function(response, options) {
		    if (options.waitMsgTarget) {
			if (Proxmox.Utils.toolkit === 'touch') {
			    options.waitMsgTarget.setMasked(false);
			} else {
			    options.waitMsgTarget.setLoading(false);
			}
		    }
		    response.result = {};
		    try {
			response.result = Ext.decode(response.responseText);
		    } catch (e) {
			// ignore
		    }
		    let msg = gettext('Connection error') + ' - server offline?';
		    if (response.aborted) {
			msg = gettext('Connection error') + ' - aborted.';
		    } else if (response.timedout) {
			msg = gettext('Connection error') + ' - Timeout.';
		    } else if (response.status && response.statusText) {
			msg = gettext('Connection error') + ' ' + response.status + ': ' + response.statusText;
		    }
		    response.htmlStatus = msg;
		    Ext.callback(callbackFn, options.scope, [options, false, response]);
		    Ext.callback(failureFn, options.scope, [response, options]);
		},
	    });
	};

	createWrapper(reqOpts.success, reqOpts.callback, reqOpts.failure);

	let target = newopts.waitMsgTarget;
	if (target) {
	    if (Proxmox.Utils.toolkit === 'touch') {
		target.setMasked({ xtype: 'loadmask', message: newopts.waitMsg });
	    } else {
		// Note: ExtJS bug - this does not work when component is not rendered
		target.setLoading(newopts.waitMsg);
	    }
	}
	Ext.Ajax.request(newopts);
    },

    // can be useful for catching displaying errors from the API, e.g.:
    // Proxmox.Async.api2({
    //     ...
    // }).catch(Proxmox.Utils.alertResponseFailure);
    alertResponseFailure: (response) => {
	Ext.Msg.alert(
	    gettext('Error'),
	    response.htmlStatus || response.result.message,
	);
    },

    checked_command: function(orig_cmd) {
	Proxmox.Utils.API2Request(
	    {
		url: '/nodes/localhost/subscription',
		method: 'GET',
		failure: function(response, opts) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		},
		success: function(response, opts) {
		    let res = response.result;
		    if (res === null || res === undefined || !res || res
			.data.status.toLowerCase() !== 'active') {
			Ext.Msg.show({
			    title: gettext('No valid subscription'),
			    icon: Ext.Msg.WARNING,
			    message: Proxmox.Utils.getNoSubKeyHtml(res.data.url),
			    buttons: Ext.Msg.OK,
			    callback: function(btn) {
				if (btn !== 'ok') {
				    return;
				}
				orig_cmd();
			    },
			});
		    } else {
			orig_cmd();
		    }
		},
	    },
	);
    },

    assemble_field_data: function(values, data) {
        if (!Ext.isObject(data)) {
	    return;
	}
	Ext.Object.each(data, function(name, val) {
	    if (Object.prototype.hasOwnProperty.call(values, name)) {
		let bucket = values[name];
		if (!Ext.isArray(bucket)) {
		    bucket = values[name] = [bucket];
		}
		if (Ext.isArray(val)) {
		    values[name] = bucket.concat(val);
		} else {
		    bucket.push(val);
		}
	    } else {
		values[name] = val;
	    }
	});
    },

    updateColumnWidth: function(container) {
	let mode = Ext.state.Manager.get('summarycolumns') || 'auto';
	let factor;
	if (mode !== 'auto') {
	    factor = parseInt(mode, 10);
	    if (Number.isNaN(factor)) {
		factor = 1;
	    }
	} else {
	    factor = container.getSize().width < 1600 ? 1 : 2;
	}

	if (container.oldFactor === factor) {
	    return;
	}

	let items = container.query('>'); // direct childs
	factor = Math.min(factor, items.length);
	container.oldFactor = factor;

	items.forEach((item) => {
	    item.columnWidth = 1 / factor;
	});

	// we have to update the layout twice, since the first layout change
	// can trigger the scrollbar which reduces the amount of space left
	container.updateLayout();
	container.updateLayout();
    },

    dialog_title: function(subject, create, isAdd) {
	if (create) {
	    if (isAdd) {
		return gettext('Add') + ': ' + subject;
	    } else {
		return gettext('Create') + ': ' + subject;
	    }
	} else {
	    return gettext('Edit') + ': ' + subject;
	}
    },

    network_iface_types: {
	eth: gettext("Network Device"),
	bridge: 'Linux Bridge',
	bond: 'Linux Bond',
	vlan: 'Linux VLAN',
	OVSBridge: 'OVS Bridge',
	OVSBond: 'OVS Bond',
	OVSPort: 'OVS Port',
	OVSIntPort: 'OVS IntPort',
    },

    render_network_iface_type: function(value) {
	return Proxmox.Utils.network_iface_types[value] ||
	    Proxmox.Utils.unknownText;
    },

    task_desc_table: {
	aptupdate: ['', gettext('Update package database')],
	diskinit: ['Disk', gettext('Initialize Disk with GPT')],
	spiceshell: ['', gettext('Shell') + ' (Spice)'],
	srvreload: ['SRV', gettext('Reload')],
	srvrestart: ['SRV', gettext('Restart')],
	srvstart: ['SRV', gettext('Start')],
	srvstop: ['SRV', gettext('Stop')],
	termproxy: ['', gettext('Console') + ' (xterm.js)'],
	vncshell: ['', gettext('Shell')],
    },

    // to add or change existing for product specific ones
    override_task_descriptions: function(extra) {
	for (const [key, value] of Object.entries(extra)) {
	    Proxmox.Utils.task_desc_table[key] = value;
	}
    },

    format_task_description: function(type, id) {
	let farray = Proxmox.Utils.task_desc_table[type];
	let text;
	if (!farray) {
	    text = type;
	    if (id) {
		type += ' ' + id;
	    }
	    return text;
	} else if (Ext.isFunction(farray)) {
	    return farray(type, id);
	}
	let prefix = farray[0];
	text = farray[1];
	if (prefix && id !== undefined) {
	    return prefix + ' ' + id + ' - ' + text;
	}
	return text;
    },

    format_size: function(size) {
	let units = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi'];
	let num = 0;
	while (size >= 1024 && num++ <= units.length) {
	    size = size / 1024;
	}

	return size.toFixed(num > 0?2:0) + " " + units[num] + "B";
    },

    render_upid: function(value, metaData, record) {
	let task = record.data;
	let type = task.type || task.worker_type;
	let id = task.id || task.worker_id;

	return Proxmox.Utils.format_task_description(type, id);
    },

    render_uptime: function(value) {
	let uptime = value;

	if (uptime === undefined) {
	    return '';
	}

	if (uptime <= 0) {
	    return '-';
	}

	return Proxmox.Utils.format_duration_long(uptime);
    },

    systemd_unescape: function(string_value) {
	const charcode_0 = '0'.charCodeAt(0);
	const charcode_9 = '9'.charCodeAt(0);
	const charcode_A = 'A'.charCodeAt(0);
	const charcode_F = 'F'.charCodeAt(0);
	const charcode_a = 'a'.charCodeAt(0);
	const charcode_f = 'f'.charCodeAt(0);
	const charcode_x = 'x'.charCodeAt(0);
	const charcode_minus = '-'.charCodeAt(0);
	const charcode_slash = '/'.charCodeAt(0);
	const charcode_backslash = '\\'.charCodeAt(0);

	let parse_hex_digit = function(d) {
	    if (d >= charcode_0 && d <= charcode_9) {
		return d - charcode_0;
	    }
	    if (d >= charcode_A && d <= charcode_F) {
		return d - charcode_A + 10;
	    }
	    if (d >= charcode_a && d <= charcode_f) {
		return d - charcode_a + 10;
	    }
	    throw "got invalid hex digit";
	};

	let value = new TextEncoder().encode(string_value);
	let result = new Uint8Array(value.length);

	let i = 0;
	let result_len = 0;

	while (i < value.length) {
	    let c0 = value[i];
	    if (c0 === charcode_minus) {
		result.set([charcode_slash], result_len);
		result_len += 1;
		i += 1;
		continue;
	    }
	    if ((i + 4) < value.length) {
		let c1 = value[i+1];
		if (c0 === charcode_backslash && c1 === charcode_x) {
		    let h1 = parse_hex_digit(value[i+2]);
		    let h0 = parse_hex_digit(value[i+3]);
		    let ord = h1*16+h0;
		    result.set([ord], result_len);
		    result_len += 1;
		    i += 4;
		    continue;
		}
	    }
	    result.set([c0], result_len);
	    result_len += 1;
	    i += 1;
	}

	return new TextDecoder().decode(result.slice(0, result.len));
    },

    parse_task_upid: function(upid) {
	let task = {};

	let res = upid.match(/^UPID:([^\s:]+):([0-9A-Fa-f]{8}):([0-9A-Fa-f]{8,9}):(([0-9A-Fa-f]{8,16}):)?([0-9A-Fa-f]{8}):([^:\s]+):([^:\s]*):([^:\s]+):$/);
	if (!res) {
	    throw "unable to parse upid '" + upid + "'";
	}
	task.node = res[1];
	task.pid = parseInt(res[2], 16);
	task.pstart = parseInt(res[3], 16);
	if (res[5] !== undefined) {
	    task.task_id = parseInt(res[5], 16);
	}
	task.starttime = parseInt(res[6], 16);
	task.type = res[7];
	task.id = Proxmox.Utils.systemd_unescape(res[8]);
	task.user = res[9];

	task.desc = Proxmox.Utils.format_task_description(task.type, task.id);

	return task;
    },

    parse_task_status: function(status) {
	if (status === 'OK') {
	    return 'ok';
	}

	if (status === 'unknown') {
	    return 'unknown';
	}

	let match = status.match(/^WARNINGS: (.*)$/);
	if (match) {
	    return 'warning';
	}

	return 'error';
    },

    format_task_status: function(status) {
	let parsed = Proxmox.Utils.parse_task_status(status);
	switch (parsed) {
	    case 'unknown': return Proxmox.Utils.unknownText;
	    case 'error': return Proxmox.Utils.errorText + ': ' + status;
	    case 'warning': return status.replace('WARNINGS', Proxmox.Utils.warningsText);
	    case 'ok': // fall-through
	    default: return status;
	}
    },

    render_duration: function(value) {
	if (value === undefined) {
	    return '-';
	}
	return Proxmox.Utils.format_duration_human(value);
    },

    render_timestamp: function(value, metaData, record, rowIndex, colIndex, store) {
	let servertime = new Date(value * 1000);
	return Ext.Date.format(servertime, 'Y-m-d H:i:s');
    },

    render_zfs_health: function(value) {
	if (typeof value === 'undefined') {
	    return "";
	}
	var iconCls = 'question-circle';
	switch (value) {
	    case 'AVAIL':
	    case 'ONLINE':
		iconCls = 'check-circle good';
		break;
	    case 'REMOVED':
	    case 'DEGRADED':
		iconCls = 'exclamation-circle warning';
		break;
	    case 'UNAVAIL':
	    case 'FAULTED':
	    case 'OFFLINE':
		iconCls = 'times-circle critical';
		break;
	    default: //unknown
	}

	return '<i class="fa fa-' + iconCls + '"></i> ' + value;
    },

    get_help_info: function(section) {
	let helpMap;
	if (typeof proxmoxOnlineHelpInfo !== 'undefined') {
	    helpMap = proxmoxOnlineHelpInfo; // eslint-disable-line no-undef
	} else if (typeof pveOnlineHelpInfo !== 'undefined') {
	    // be backward compatible with older pve-doc-generators
	    helpMap = pveOnlineHelpInfo; // eslint-disable-line no-undef
	} else {
	    throw "no global OnlineHelpInfo map declared";
	}

	if (helpMap[section]) {
	    return helpMap[section];
	}
	// try to normalize - and _ separators, to support asciidoc and sphinx
	// references at the same time.
	let section_minus_normalized = section.replace(/_/g, '-');
	if (helpMap[section_minus_normalized]) {
	    return helpMap[section_minus_normalized];
	}
	let section_underscore_normalized = section.replace(/-/g, '_');
	return helpMap[section_underscore_normalized];
    },

    get_help_link: function(section) {
	let info = Proxmox.Utils.get_help_info(section);
	if (!info) {
	    return undefined;
	}
	return window.location.origin + info.link;
    },

    openXtermJsViewer: function(vmtype, vmid, nodename, vmname, cmd) {
	let url = Ext.Object.toQueryString({
	    console: vmtype, // kvm, lxc, upgrade or shell
	    xtermjs: 1,
	    vmid: vmid,
	    vmname: vmname,
	    node: nodename,
	    cmd: cmd,

	});
	let nw = window.open("?" + url, '_blank', 'toolbar=no,location=no,status=no,menubar=no,resizable=yes,width=800,height=420');
	if (nw) {
	    nw.focus();
	}
    },

    render_optional_url: function(value) {
	if (value && value.match(/^https?:\/\//) !== null) {
	    return '<a target="_blank" href="' + value + '">' + value + '</a>';
	}
	return value;
    },

    render_san: function(value) {
	var names = [];
	if (Ext.isArray(value)) {
	    value.forEach(function(val) {
		if (!Ext.isNumber(val)) {
		    names.push(val);
		}
	    });
	    return names.join('<br>');
	}
	return value;
    },

    render_usage: val => (val*100).toFixed(2) + '%',

    render_cpu_usage: function(val, max) {
	return Ext.String.format(
	    `${gettext('{0}% of {1}')} ${gettext('CPU(s)')}`,
	    (val*100).toFixed(2),
	    max,
	);
    },

    render_size_usage: function(val, max) {
	if (max === 0) {
	    return gettext('N/A');
	}
	return (val*100/max).toFixed(2) + '% (' +
	    Ext.String.format(gettext('{0} of {1}'),
	    Proxmox.Utils.render_size(val), Proxmox.Utils.render_size(max)) + ')';
    },

    render_cpu: function(value, metaData, record, rowIndex, colIndex, store) {
	if (!(record.data.uptime && Ext.isNumeric(value))) {
	    return '';
	}

	let maxcpu = record.data.maxcpu || 1;
	if (!Ext.isNumeric(maxcpu) || maxcpu < 1) {
	    return '';
	}
	let cpuText = maxcpu > 1 ? 'CPUs' : 'CPU';
	let ratio = (value * 100).toFixed(1);
	return `${ratio}% of ${maxcpu.toString()} ${cpuText}`;
    },

    render_size: function(value, metaData, record, rowIndex, colIndex, store) {
	if (!Ext.isNumeric(value)) {
	    return '';
	}
	return Proxmox.Utils.format_size(value);
    },

    render_cpu_model: function(cpu) {
	let socketText = cpu.sockets > 1 ? gettext('Sockets') : gettext('Socket');
	return `${cpu.cpus} x ${cpu.model} (${cpu.sockets.toString()} ${socketText})`;
    },

    /* this is different for nodes */
    render_node_cpu_usage: function(value, record) {
	return Proxmox.Utils.render_cpu_usage(value, record.cpus);
    },

    render_node_size_usage: function(record) {
	return Proxmox.Utils.render_size_usage(record.used, record.total);
    },

    loadTextFromFile: function(file, callback, maxBytes) {
	let maxSize = maxBytes || 8192;
	if (file.size > maxSize) {
	    Ext.Msg.alert(gettext('Error'), gettext("Invalid file size: ") + file.size);
	    return;
	}
	let reader = new FileReader();
	reader.onload = evt => callback(evt.target.result);
	reader.readAsText(file);
    },

    parsePropertyString: function(value, defaultKey) {
	var res = {},
	    error;

	if (typeof value !== 'string' || value === '') {
	    return res;
	}

	Ext.Array.each(value.split(','), function(p) {
	    var kv = p.split('=', 2);
	    if (Ext.isDefined(kv[1])) {
		res[kv[0]] = kv[1];
	    } else if (Ext.isDefined(defaultKey)) {
		if (Ext.isDefined(res[defaultKey])) {
		    error = 'defaultKey may be only defined once in propertyString';
		    return false; // break
		}
		res[defaultKey] = kv[0];
	    } else {
		error = 'invalid propertyString, not a key=value pair and no defaultKey defined';
		return false; // break
	    }
	    return true;
	});

	if (error !== undefined) {
	    console.error(error);
	    return undefined;
	}

	return res;
    },

    printPropertyString: function(data, defaultKey) {
	var stringparts = [],
	    gotDefaultKeyVal = false,
	    defaultKeyVal;

	Ext.Object.each(data, function(key, value) {
	    if (defaultKey !== undefined && key === defaultKey) {
		gotDefaultKeyVal = true;
		defaultKeyVal = value;
	    } else if (Ext.isArray(value)) {
		stringparts.push(key + '=' + value.join(';'));
	    } else if (value !== '') {
		stringparts.push(key + '=' + value);
	    }
	});

	stringparts = stringparts.sort();
	if (gotDefaultKeyVal) {
	    stringparts.unshift(defaultKeyVal);
	}

	return stringparts.join(',');
    },

    acmedomain_count: 5,

    parseACMEPluginData: function(data) {
	let res = {};
	let extradata = [];
	data.split('\n').forEach((line) => {
	    // capture everything after the first = as value
	    let [key, value] = line.split('=');
	    if (value !== undefined) {
		res[key] = value;
	    } else {
		extradata.push(line);
	    }
	});
	return [res, extradata];
    },

    delete_if_default: function(values, fieldname, default_val, create) {
	if (values[fieldname] === '' || values[fieldname] === default_val) {
	    if (!create) {
		if (values.delete) {
		    if (Ext.isArray(values.delete)) {
			values.delete.push(fieldname);
		    } else {
			values.delete += ',' + fieldname;
		    }
		} else {
		    values.delete = fieldname;
		}
	    }

	    delete values[fieldname];
	}
    },

    printACME: function(value) {
	if (Ext.isArray(value.domains)) {
	    value.domains = value.domains.join(';');
	}
	return Proxmox.Utils.printPropertyString(value);
    },

    parseACME: function(value) {
	if (!value) {
	    return {};
	}

	var res = {};
	var error;

	Ext.Array.each(value.split(','), function(p) {
	    var kv = p.split('=', 2);
	    if (Ext.isDefined(kv[1])) {
		res[kv[0]] = kv[1];
	    } else {
		error = 'Failed to parse key-value pair: '+p;
		return false;
	    }
	    return true;
	});

	if (error !== undefined) {
	    console.error(error);
	    return undefined;
	}

	if (res.domains !== undefined) {
	    res.domains = res.domains.split(/;/);
	}

	return res;
    },

    add_domain_to_acme: function(acme, domain) {
	if (acme.domains === undefined) {
	    acme.domains = [domain];
	} else {
	    acme.domains.push(domain);
	    acme.domains = acme.domains.filter((value, index, self) => self.indexOf(value) === index);
	}
	return acme;
    },

    remove_domain_from_acme: function(acme, domain) {
	if (acme.domains !== undefined) {
	    acme.domains = acme.domains.filter(
		(value, index, self) => self.indexOf(value) === index && value !== domain,
	    );
	}
	return acme;
    },

    updateColumns: function(container) {
	let mode = Ext.state.Manager.get('summarycolumns') || 'auto';
	let factor;
	if (mode !== 'auto') {
	    factor = parseInt(mode, 10);
	    if (Number.isNaN(factor)) {
		factor = 1;
	    }
	} else {
	    factor = container.getSize().width < 1400 ? 1 : 2;
	}

	if (container.oldFactor === factor) {
	    return;
	}

	let items = container.query('>'); // direct childs
	factor = Math.min(factor, items.length);
	container.oldFactor = factor;

	items.forEach((item) => {
	    item.columnWidth = 1 / factor;
	});

	// we have to update the layout twice, since the first layout change
	// can trigger the scrollbar which reduces the amount of space left
	container.updateLayout();
	container.updateLayout();
    },
},

    singleton: true,
    constructor: function() {
	let me = this;
	Ext.apply(me, me.utilities);

	let IPV4_OCTET = "(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])";
	let IPV4_REGEXP = "(?:(?:" + IPV4_OCTET + "\\.){3}" + IPV4_OCTET + ")";
	let IPV6_H16 = "(?:[0-9a-fA-F]{1,4})";
	let IPV6_LS32 = "(?:(?:" + IPV6_H16 + ":" + IPV6_H16 + ")|" + IPV4_REGEXP + ")";
	let IPV4_CIDR_MASK = "([0-9]{1,2})";
	let IPV6_CIDR_MASK = "([0-9]{1,3})";


	me.IP4_match = new RegExp("^(?:" + IPV4_REGEXP + ")$");
	me.IP4_cidr_match = new RegExp("^(?:" + IPV4_REGEXP + ")/" + IPV4_CIDR_MASK + "$");

	/* eslint-disable no-useless-concat,no-multi-spaces */
	let IPV6_REGEXP = "(?:" +
	    "(?:(?:"                                                  + "(?:" + IPV6_H16 + ":){6})" + IPV6_LS32 + ")|" +
	    "(?:(?:"                                         +   "::" + "(?:" + IPV6_H16 + ":){5})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:"                           + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){4})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,1}" + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){3})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,2}" + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){2})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,3}" + IPV6_H16 + ")?::" + "(?:" + IPV6_H16 + ":){1})" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,4}" + IPV6_H16 + ")?::" +                         ")" + IPV6_LS32 + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,5}" + IPV6_H16 + ")?::" +                         ")" + IPV6_H16  + ")|" +
	    "(?:(?:(?:(?:" + IPV6_H16 + ":){0,7}" + IPV6_H16 + ")?::" +                         ")"             + ")"  +
	    ")";
	/* eslint-enable no-useless-concat,no-multi-spaces */

	me.IP6_match = new RegExp("^(?:" + IPV6_REGEXP + ")$");
	me.IP6_cidr_match = new RegExp("^(?:" + IPV6_REGEXP + ")/" + IPV6_CIDR_MASK + "$");
	me.IP6_bracket_match = new RegExp("^\\[(" + IPV6_REGEXP + ")\\]");

	me.IP64_match = new RegExp("^(?:" + IPV6_REGEXP + "|" + IPV4_REGEXP + ")$");
	me.IP64_cidr_match = new RegExp("^(?:" + IPV6_REGEXP + "/" + IPV6_CIDR_MASK + ")|(?:" + IPV4_REGEXP + "/" + IPV4_CIDR_MASK + ")$");

	let DnsName_REGEXP = "(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\\-]*[a-zA-Z0-9])?)\\.)*(?:[A-Za-z0-9](?:[A-Za-z0-9\\-]*[A-Za-z0-9])?))";
	me.DnsName_match = new RegExp("^" + DnsName_REGEXP + "$");

	me.HostPort_match = new RegExp("^(" + IPV4_REGEXP + "|" + DnsName_REGEXP + ")(?::(\\d+))?$");
	me.HostPortBrackets_match = new RegExp("^\\[(" + IPV6_REGEXP + "|" + IPV4_REGEXP + "|" + DnsName_REGEXP + ")\\](?::(\\d+))?$");
	me.IP6_dotnotation_match = new RegExp("^(" + IPV6_REGEXP + ")(?:\\.(\\d+))?$");
	me.Vlan_match = /^vlan(\d+)/;
	me.VlanInterface_match = /(\w+)\.(\d+)/;
    },
});

Ext.define('Proxmox.Async', {
    singleton: true,

    // Returns a Promise resolving to the result of an `API2Request` or rejecting to the error
    // repsonse on failure
    api2: function(reqOpts) {
	return new Promise((resolve, reject) => {
	    delete reqOpts.callback; // not allowed in this api
	    reqOpts.success = response => resolve(response);
	    reqOpts.failure = response => reject(response);
	    Proxmox.Utils.API2Request(reqOpts);
	});
    },

    // Delay for a number of milliseconds.
    sleep: function(millis) {
	return new Promise((resolve, _reject) => setTimeout(resolve, millis));
    },
});
