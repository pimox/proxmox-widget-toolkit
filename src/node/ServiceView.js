Ext.define('proxmox-services', {
    extend: 'Ext.data.Model',
    fields: ['service', 'name', 'desc', 'state'],
    idProperty: 'service',
});

Ext.define('Proxmox.node.ServiceView', {
    extend: 'Ext.grid.GridPanel',

    alias: ['widget.proxmoxNodeServiceView'],

    startOnlyServices: {},

    restartCommand: "restart", // TODO: default to reload once everywhere supported

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	let rstore = Ext.create('Proxmox.data.UpdateStore', {
	    interval: 1000,
	    model: 'proxmox-services',
	    proxy: {
                type: 'proxmox',
                url: "/api2/json/nodes/" + me.nodename + "/services",
	    },
	});

	let store = Ext.create('Proxmox.data.DiffStore', {
	    rstore: rstore,
	    sortAfterUpdate: true,
	    sorters: [
		{
		    property: 'name',
		    direction: 'ASC',
		},
	    ],
	});

	let view_service_log = function() {
	    let sm = me.getSelectionModel();
	    let rec = sm.getSelection()[0];
	    let win = Ext.create('Ext.window.Window', {
		title: gettext('Syslog') + ': ' + rec.data.service,
		modal: true,
		width: 800,
		height: 400,
		layout: 'fit',
		items: {
		    xtype: 'proxmoxLogView',
		    url: "/api2/extjs/nodes/" + me.nodename + "/syslog?service=" +
			rec.data.service,
		    log_select_timespan: 1,
		},
	    });
	    win.show();
	};

	let service_cmd = function(cmd) {
	    let rec = me.getSelectionModel().getSelection()[0];
	    let service = rec.data.service;
	    Proxmox.Utils.API2Request({
		url: `/nodes/${me.nodename}/services/${service}/${cmd}`,
		method: 'POST',
		failure: function(response, opts) {
		    Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    me.loading = true;
		},
		success: function(response, opts) {
		    rstore.startUpdate();
		    let upid = response.result.data;

		    let win = Ext.create('Proxmox.window.TaskProgress', {
			upid: upid,
		    });
		    win.show();
		},
	    });
	};

	let start_btn = new Ext.Button({
	    text: gettext('Start'),
	    disabled: true,
	    handler: function() {
		service_cmd("start");
	    },
	});

	let stop_btn = new Ext.Button({
	    text: gettext('Stop'),
	    disabled: true,
	    handler: function() {
		service_cmd("stop");
	    },
	});

	let restart_btn = new Ext.Button({
	    text: gettext('Restart'),
	    disabled: true,
	    handler: function() {
		service_cmd(me.restartCommand || "restart");
	    },
	});

	let syslog_btn = new Ext.Button({
	    text: gettext('Syslog'),
	    disabled: true,
	    handler: view_service_log,
	});

	let set_button_status = function() {
	    let sm = me.getSelectionModel();
	    let rec = sm.getSelection()[0];

	    if (!rec) {
		start_btn.disable();
		stop_btn.disable();
		restart_btn.disable();
		syslog_btn.disable();
		return;
	    }
	    let service = rec.data.service;
	    let state = rec.data.state;

	    syslog_btn.enable();

	    if (state === 'running') {
		start_btn.disable();
		restart_btn.enable();
	    } else {
		start_btn.enable();
		restart_btn.disable();
	    }
	    if (!me.startOnlyServices[service]) {
		if (state === 'running') {
		    stop_btn.enable();
		} else {
		    stop_btn.disable();
		}
	    }
	};

	me.mon(store, 'refresh', set_button_status);

	Proxmox.Utils.monStoreErrors(me, rstore);

	Ext.apply(me, {
	    store: store,
	    stateful: false,
	    tbar: [start_btn, stop_btn, restart_btn, syslog_btn],
	    columns: [
		{
		    header: gettext('Name'),
		    flex: 1,
		    sortable: true,
		    dataIndex: 'name',
		},
		{
		    header: gettext('Status'),
		    width: 100,
		    sortable: true,
		    dataIndex: 'state',
		},
		{
		    header: gettext('Description'),
		    renderer: Ext.String.htmlEncode,
		    dataIndex: 'desc',
		    flex: 2,
		},
	    ],
	    listeners: {
		selectionchange: set_button_status,
		itemdblclick: view_service_log,
		activate: rstore.startUpdate,
		destroy: rstore.stopUpdate,
	    },
	});

	me.callParent();
    },
});
