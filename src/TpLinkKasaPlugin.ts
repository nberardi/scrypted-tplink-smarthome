import sdk, { DeviceCreator, ScryptedNativeId, DeviceCreatorSettings, SettingValue, ScryptedDeviceType, ScryptedInterface, Device } from '@scrypted/sdk';
import { DeviceDiscovery, DeviceProvider, ScryptedDeviceBase, Setting, Settings } from '@scrypted/sdk';
import { StorageSettings } from "@scrypted/sdk/storage-settings";
import { Bulb, Client as TplinkClient, Device as TplinkDevice, Plug } from 'tplink-smarthome-api';
import { KasaBase } from './KasaBase';
import { KasaBulb } from './KasaBulb';
import { KasaPlug } from "./KasaPlug";

const { deviceManager } = sdk;

var kasa_switch_descriptions = [ 
    "Smart Wi-Fi Light Switch",
    "Smart Wi-Fi 3-Way Light Switch",
    "Wi-Fi Smart Dimmer",
];

export class TpLinkKasaPlugin extends ScryptedDeviceBase implements DeviceProvider, DeviceCreator, Settings {
    storageSettings = new StorageSettings(this, {
        transport: {
            title: "Transport",
            type: "string",
            choices: ["tcp", "udp"],
            value: "tcp",
            description: "The transport protocol for devices.",
            onPut: () => this.connect()
        },
        timeout: {
            title: "Timeout",
            type: "number",
            placeholder: 10000,
            value: 10000,
            description: "The timeout in miliseconds. The default is 10,000 ms or 10 s.",
            onPut: () => this.connect()
        },
        useSharedSocket: {
            title: "Shared Socket",
            type: "boolean",
            value: false,
            description: "Attempt to reuse a shared socket if available if transport is set to \"udp\".",
            onPut: () => this.connect()
        },
        sharedSocketTimeout: {
            title: "Shared Socket Timeout",
            type: "number",
            placeholder: 20000,
            value: 20000,
            description: "The timeout in miliseconds to wait for another send before closing a shared socket. 0 = never automatically close socket. The default is 20,000 ms or 20 s.",
            onPut: () => this.connect()
        },
        broadcast: {
            title: "Broadcast",
            type: "string",
            placeholder: "255.255.255.255",
            description: "UDP broadcast address.",
            onPut: () => this.connect()
        },
        apiLogToConsole: {
            title: "Log",
            type: "boolean",
            value: false,
            description: "Log the connection information to the console.",
            onPut: () => this.connect()
        },
        apiLogLevel: {
            title: "Log Level",
            type: "string",
            placeholder: "warn",
            choices: ['trace', 'debug', 'info', 'warn', 'error', 'silent'],
            value: "warn",
            description: "Change this if you need more information transmitted in the log..",
            onPut: () => this.connect()
        }
    });

    client: TplinkClient;
    tplinkDevices = new Map<string, TplinkDevice>();
    devices = new Map<string, KasaBase<Bulb | Plug>>();

    constructor(nativeId?: string) {
        super(nativeId);
        this.connect();
    }

    connect() {
        const self = this;

        let ids = deviceManager.getNativeIds();
        for (const nativeId of ids) {
            if (!this.devices.has(nativeId)) {
                let d = deviceManager.getDeviceState(nativeId);
                switch(d.type) {
                    case ScryptedDeviceType.Outlet:
                        let p = new KasaPlug(nativeId);
                        p.online = false;
                        this.devices.set(nativeId, p);
                        break;
                    case ScryptedDeviceType.Switch:
                        let s = new KasaPlug(nativeId);
                        s.online = false;
                        this.devices.set(nativeId, s);
                        break;
                    case ScryptedDeviceType.Light: 
                        let b = new KasaBulb(nativeId);
                        b.online = false;
                        this.devices.set(nativeId, b);
                        break;
                }
            }
        }

        if (this.client !== undefined) {
            try {
                this.console.info("Stopping discovery.");
                this.client.stopDiscovery();
            } catch (err) {
                this.console.error(err);
            }
        }
        
        this.client = new TplinkClient({
            logger: this.storageSettings.values.apiLogToConsole ? this.console : undefined,
            logLevel: this.storageSettings.values.apiLogToConsole ? this.storageSettings.values.apiLogLevel : undefined,
            defaultSendOptions: {
                timeout: this.storageSettings.values.timeout,
                transport: this.storageSettings.values.transport
            }
        });
        
        this.client.on('error', self.console.error);
        this.client.on('discovery-invalid', self.console.error);

        this.client.on('device-new', (device: TplinkDevice) => {
            self.console.info(`New Device: [${device.alias}] ${device.deviceType} [${device.id}]`);

            return self.foundDevice(self, device);
        });
        this.client.on('device-online', (device: TplinkDevice) => {
            self.console.info(`Online: [${device.alias}] ${device.deviceType} [${device.id}]`);

            if (self.devices.has(device.id)) {
                const d = self.devices.get(device.id);
                if (d)
                    d.online = true;
            }

            return self.foundDevice(self, device);
        });
        
        this.client.on('device-offline', async (device: TplinkDevice) => {
            self.console.info(`Offline: [${device.alias}] ${device.deviceType} [${device.id}]`);

            if (self.devices.has(device.id)) {
                const d = self.devices.get(device.id);
                if (d)
                    d.online = false;
            }

            if (self.tplinkDevices.has(device.id))
                self.tplinkDevices.delete(device.id);
        });

        this.client.startDiscovery({
            broadcast: this.storageSettings.values.broadcast,
            filterCallback: (sysInfo) => {
                return sysInfo.deviceId != null && sysInfo.deviceId.length > 0;
            }
        });
    }

    async foundDevice(plugin: TpLinkKasaPlugin, device: TplinkDevice) : Promise<string> {
        // needs to be device.id instead of device.deviceId, incase it is a plug with more than one outlet
        const deviceId = device.id;

        if (deviceId === null || deviceId.length === 0) {
            this.console.error('Missing deviceId: %s', device.host);
            return deviceId;
        }

        if (plugin.tplinkDevices.has(deviceId)) 
            return deviceId;

        plugin.tplinkDevices.set(deviceId, device);

        const d: Device = {
            providerNativeId: plugin.nativeId,
            name: device.alias,
            type: device instanceof Plug ? 
                        (kasa_switch_descriptions.includes(device.description ?? "") 
                            ? ScryptedDeviceType.Switch : ScryptedDeviceType.Outlet) 
                    : device instanceof Bulb ?
                         ScryptedDeviceType.Light : ScryptedDeviceType.Unknown,
            nativeId: deviceId,
            interfaces: [
                ScryptedInterface.OnOff, 
                ScryptedInterface.Settings, 
                ScryptedInterface.Online],
            info: {
                model: device.model,
                mac: device.mac,
                manufacturer: "TP-Link Kasa",
                serialNumber: deviceId,
                firmware: device.softwareVersion,
                version: device.hardwareVersion
            }
        };

        if (device instanceof Plug) {
            const p = device as Plug;

            if (p.supportsDimmer) {
                d.interfaces.push(ScryptedInterface.Brightness);
            }

            if (this.devices.has(deviceId)) {
                var k = this.devices.get(deviceId);
                k?.connect(p);
            } else {
                var kp = new KasaPlug(deviceId);
                this.devices.set(deviceId, kp);
            }
        } else  if (device instanceof Bulb) {
            const b = device as Bulb;

            if (b.supportsBrightness) {
                d.interfaces.push(ScryptedInterface.Brightness);
            }

            if (b.supportsColor) {
                d.interfaces.push(ScryptedInterface.ColorSettingHsv);
            }

            if (b.supportsColorTemperature) {
                d.interfaces.push(ScryptedInterface.ColorSettingTemperature);
            }

            if (this.devices.has(deviceId)) {
                var k = this.devices.get(deviceId);
                k?.connect(b);
            } else {
                var kb = new KasaBulb(deviceId);
                this.devices.set(deviceId, kb);            }
        }

        await deviceManager.onDeviceDiscovered(d);
        plugin.console.info(`Added: [${d.name}] ${d.type} [${d.nativeId}]`);
        if (this.devices.has(deviceId)) {
            var k = this.devices.get(deviceId);
            if (device instanceof Plug) {
                const p = device as Plug;
                k?.connect(p);
            } else if (device instanceof Bulb) {
                const p = device as Bulb;
                k?.connect(p);
            }
        }
        
        return d.nativeId;
    }

    async getCreateDeviceSettings(): Promise<Setting[]> {
        return [
            {
                key: 'ipAddress',
                title: "IP Address",
                type: "string",
                placeholder: "192.168.1.XX",
                description: "The IP Address of the device on your local network."
            },
            {
                key: "port",
                title: "Port (optional)",
                type: "number",
                placeholder: "9999",
                value: 9999,
                description: "The port defaults to 9999, but can be overriden.",
            }
        ];
    }

    getDevice(nativeId: string) {
        if (this.devices.has(nativeId))
            return this.devices.get(nativeId);

        this.console.error(`Cannot Find Device: [${nativeId}]`);
        return undefined;
    }

    createDevice(settings: DeviceCreatorSettings): Promise<string> {
        const ipAddress = settings.ipAddress.toString();
        const port = settings.port;

        const d = this.client.getDevice({
            host: ipAddress,
            port: port
        });

        return this.foundDevice(this, d);
    }

    getSettings(): Promise<Setting[]> {
        return this.storageSettings.getSettings();
    }

    putSetting(key: string, value: SettingValue): Promise<void> {
        return this.storageSettings.putSetting(key, value);
    }
}
