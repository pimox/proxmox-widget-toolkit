Ext.define('proxmox-networks', {
    extend: 'Ext.data.Model',
    fields: [
	'active',
	'address',
	'address6',
	'autostart',
	'bridge_ports',
	'cidr',
	'cidr6',
	'comments',
	'gateway',
	'gateway6',
	'iface',
	'netmask',
	'netmask6',
	'slaves',
	'type',
    ],
    idProperty: 'iface',
});

Ext.define('Proxmox.node.NetworkView', {
    extend: 'Ext.panel.Panel',

    alias: ['widget.proxmoxNodeNetworkView'],

    // defines what types of network devices we want to create
    // order is always the same
    types: ['bridge', 'bond', 'vlan', 'ovs'],

    showApplyBtn: false,

    initComponent: function() {
	let me = this;

	if (!me.nodename) {
	    throw "no node name specified";
	}

	let baseUrl = '/nodes/' + me.nodename + '/network';

	let store = Ext.create('Ext.data.Store', {
	    model: 'proxmox-networks',
	    proxy: {
                type: 'proxmox',
                url: '/api2/json' + baseUrl,
	    },
	    sorters: [
		{
		    property: 'iface',
		    direction: 'ASC',
		},
	    ],
	});

	let reload = function() {
	    let changeitem = me.down('#changes');
	    let apply_btn = me.down('#apply');
	    let revert_btn = me.down('#revert');
	    Proxmox.Utils.API2Request({
		url: baseUrl,
		failure: function(response, opts) {
		    store.loadData({});
		    Proxmox.Utils.setErrorMask(me, response.htmlStatus);
		    changeitem.update('');
		    changeitem.setHidden(true);
		},
		success: function(response, opts) {
		    let result = Ext.decode(response.responseText);
		    store.loadData(result.data);
		    let changes = result.changes;
		    if (changes === undefined || changes === '') {
			changes = gettext("No changes");
			changeitem.setHidden(true);
			apply_btn.setDisabled(true);
			revert_btn.setDisabled(true);
		    } else {
			changeitem.update("<pre>" + Ext.htmlEncode(changes) + "</pre>");
			changeitem.setHidden(false);
			apply_btn.setDisabled(false);
			revert_btn.setDisabled(false);
		    }
		},
	    });
	};

	let run_editor = function() {
	    let grid = me.down('gridpanel');
	    let sm = grid.getSelectionModel();
	    let rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }

	    let win = Ext.create('Proxmox.node.NetworkEdit', {
		nodename: me.nodename,
		iface: rec.data.iface,
		iftype: rec.data.type,
	    });
	    win.show();
	    win.on('destroy', reload);
	};

	let edit_btn = new Ext.Button({
	    text: gettext('Edit'),
	    disabled: true,
	    handler: run_editor,
	});

	let del_btn = new Ext.Button({
	    text: gettext('Remove'),
	    disabled: true,
	    handler: function() {
		let grid = me.down('gridpanel');
		let sm = grid.getSelectionModel();
		let rec = sm.getSelection()[0];
		if (!rec) {
		    return;
		}

		let iface = rec.data.iface;

		Proxmox.Utils.API2Request({
		    url: baseUrl + '/' + iface,
		    method: 'DELETE',
		    waitMsgTarget: me,
		    callback: function() {
			reload();
		    },
		    failure: function(response, opts) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    },
		});
	    },
	});

	let apply_btn = Ext.create('Proxmox.button.Button', {
	    text: gettext('Apply Configuration'),
	    itemId: 'apply',
	    disabled: true,
	    confirmMsg: 'Do you want to apply pending network changes?',
	    hidden: !me.showApplyBtn,
	    handler: function() {
		Proxmox.Utils.API2Request({
		    url: baseUrl,
		    method: 'PUT',
		    waitMsgTarget: me,
		    success: function(response, opts) {
			let upid = response.result.data;

			let win = Ext.create('Proxmox.window.TaskProgress', {
			    taskDone: reload,
			    upid: upid,
			});
			win.show();
		    },
		    failure: function(response, opts) {
			Ext.Msg.alert(gettext('Error'), response.htmlStatus);
		    },
		});
	    },
	});

	let set_button_status = function() {
	    let grid = me.down('gridpanel');
	    let sm = grid.getSelectionModel();
	    let rec = sm.getSelection()[0];

	    edit_btn.setDisabled(!rec);
	    del_btn.setDisabled(!rec);
	};

	let render_ports = function(value, metaData, record) {
	    if (value === 'bridge') {
		return record.data.bridge_ports;
	    } else if (value === 'bond') {
		return record.data.slaves;
	    } else if (value === 'OVSBridge') {
		return record.data.ovs_ports;
	    } else if (value === 'OVSBond') {
		return record.data.ovs_bonds;
	    }
	    return '';
	};

	let find_next_iface_id = function(prefix) {
	    let next;
	    for (next = 0; next <= 9999; next++) {
		if (!store.getById(prefix + next.toString())) {
		    break;
		}
	    }
	    return prefix + next.toString();
	};

	let menu_items = [];

	if (me.types.indexOf('bridge') !== -1) {
	    menu_items.push({
		text: Proxmox.Utils.render_network_iface_type('bridge'),
		handler: function() {
		    let win = Ext.create('Proxmox.node.NetworkEdit', {
			nodename: me.nodename,
			iftype: 'bridge',
			iface_default: find_next_iface_id('vmbr'),
			onlineHelp: 'sysadmin_network_configuration',
		    });
		    win.on('destroy', reload);
		    win.show();
		},
	    });
	}

	if (me.types.indexOf('bond') !== -1) {
	    menu_items.push({
		text: Proxmox.Utils.render_network_iface_type('bond'),
		handler: function() {
		    let win = Ext.create('Proxmox.node.NetworkEdit', {
			nodename: me.nodename,
			iftype: 'bond',
			iface_default: find_next_iface_id('bond'),
			onlineHelp: 'sysadmin_network_configuration',
		    });
		    win.on('destroy', reload);
		    win.show();
		},
	    });
	}

	if (me.types.indexOf('vlan') !== -1) {
	    menu_items.push({
		text: Proxmox.Utils.render_network_iface_type('vlan'),
		handler: function() {
		    let win = Ext.create('Proxmox.node.NetworkEdit', {
			nodename: me.nodename,
			iftype: 'vlan',
			iface_default: find_next_iface_id('vlan'),
			onlineHelp: 'sysadmin_network_configuration',
		    });
		    win.on('destroy', reload);
		    win.show();
		},
	    });
	}

	if (me.types.indexOf('ovs') !== -1) {
	    if (menu_items.length > 0) {
		menu_items.push({ xtype: 'menuseparator' });
	    }

	    menu_items.push(
		{
		    text: Proxmox.Utils.render_network_iface_type('OVSBridge'),
		    handler: function() {
			let win = Ext.create('Proxmox.node.NetworkEdit', {
			    nodename: me.nodename,
			    iftype: 'OVSBridge',
			    iface_default: find_next_iface_id('vmbr'),
			});
			win.on('destroy', reload);
			win.show();
		    },
		},
		{
		    text: Proxmox.Utils.render_network_iface_type('OVSBond'),
		    handler: function() {
			let win = Ext.create('Proxmox.node.NetworkEdit', {
			    nodename: me.nodename,
			    iftype: 'OVSBond',
			    iface_default: find_next_iface_id('bond'),
			});
			win.on('destroy', reload);
			win.show();
		    },
		},
		{
		    text: Proxmox.Utils.render_network_iface_type('OVSIntPort'),
		    handler: function() {
			let win = Ext.create('Proxmox.node.NetworkEdit', {
			    nodename: me.nodename,
			    iftype: 'OVSIntPort',
			});
			win.on('destroy', reload);
			win.show();
		    },
		},
	    );
	}

	let renderer_generator = function(fieldname) {
	    return function(val, metaData, rec) {
		let tmp = [];
		if (rec.data[fieldname]) {
		    tmp.push(rec.data[fieldname]);
		}
		if (rec.data[fieldname + '6']) {
		    tmp.push(rec.data[fieldname + '6']);
		}
		return tmp.join('<br>') || '';
	    };
	};

	Ext.apply(me, {
	    layout: 'border',
	    tbar: [
		{
		    text: gettext('Create'),
		    menu: {
			plain: true,
			items: menu_items,
		    },
		}, '-',
		{
		    text: gettext('Revert'),
		    itemId: 'revert',
		    handler: function() {
			Proxmox.Utils.API2Request({
			    url: baseUrl,
			    method: 'DELETE',
			    waitMsgTarget: me,
			    callback: function() {
				reload();
			    },
			    failure: function(response, opts) {
				Ext.Msg.alert(gettext('Error'), response.htmlStatus);
			    },
			});
		    },
		},
		edit_btn,
		del_btn,
		'-',
		apply_btn,
	    ],
	    items: [
		{
		    xtype: 'gridpanel',
		    stateful: true,
		    stateId: 'grid-node-network',
		    store: store,
		    region: 'center',
		    border: false,
		    columns: [
			{
			    header: gettext('Name'),
			    sortable: true,
			    dataIndex: 'iface',
			},
			{
			    header: gettext('Type'),
			    sortable: true,
			    width: 120,
			    renderer: Proxmox.Utils.render_network_iface_type,
			    dataIndex: 'type',
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('Active'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'active',
			    trueText: Proxmox.Utils.yesText,
			    falseText: Proxmox.Utils.noText,
			    undefinedText: Proxmox.Utils.noText,
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('Autostart'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'autostart',
			    trueText: Proxmox.Utils.yesText,
			    falseText: Proxmox.Utils.noText,
			    undefinedText: Proxmox.Utils.noText,
			},
			{
			    xtype: 'booleancolumn',
			    header: gettext('VLAN aware'),
			    width: 80,
			    sortable: true,
			    dataIndex: 'bridge_vlan_aware',
			    trueText: Proxmox.Utils.yesText,
			    falseText: Proxmox.Utils.noText,
			    undefinedText: Proxmox.Utils.noText,
			},
			{
			    header: gettext('Ports/Slaves'),
			    dataIndex: 'type',
			    renderer: render_ports,
			},
			{
			    header: gettext('Bond Mode'),
			    dataIndex: 'bond_mode',
			    renderer: Proxmox.Utils.render_bond_mode,
			},
			{
			    header: gettext('Hash Policy'),
			    hidden: true,
			    dataIndex: 'bond_xmit_hash_policy',
			},
			{
			    header: gettext('IP address'),
			    sortable: true,
			    width: 120,
			    hidden: true,
			    dataIndex: 'address',
			    renderer: renderer_generator('address'),
			},
			{
			    header: gettext('Subnet mask'),
			    width: 120,
			    sortable: true,
			    hidden: true,
			    dataIndex: 'netmask',
			    renderer: renderer_generator('netmask'),
			},
			{
			    header: gettext('CIDR'),
			    width: 150,
			    sortable: true,
			    dataIndex: 'cidr',
			    renderer: renderer_generator('cidr'),
			},
			{
			    header: gettext('Gateway'),
			    width: 150,
			    sortable: true,
			    dataIndex: 'gateway',
			    renderer: renderer_generator('gateway'),
			},
			{
			    header: gettext('Comment'),
			    dataIndex: 'comments',
			    flex: 1,
			    renderer: Ext.String.htmlEncode,
			},
		    ],
		    listeners: {
			selectionchange: set_button_status,
			itemdblclick: run_editor,
		    },
		},
		{
		    border: false,
		    region: 'south',
		    autoScroll: true,
		    hidden: true,
		    itemId: 'changes',
		    tbar: [
			gettext('Pending changes') + ' (' +
			    gettext("Either reboot or use 'Apply Configuration' (needs ifupdown2) to activate") + ')',
		    ],
		    split: true,
		    bodyPadding: 5,
		    flex: 0.6,
		    html: gettext("No changes"),
		},
	    ],
	});

	me.callParent();
	reload();
    },
});
