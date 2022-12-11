import sdk, { DeviceCreator, ScryptedNativeId, DeviceCreatorSettings, SettingValue, ScryptedDeviceType, ScryptedInterface } from '@scrypted/sdk';
import { DeviceDiscovery, DeviceProvider, ScryptedDeviceBase, Setting, Settings } from '@scrypted/sdk';
import { StorageSettings } from "@scrypted/sdk/storage-settings";
import { Client as TplinkClient, Device as TplinkDevice } from 'tplink-smarthome-api';

const { deviceManager } = sdk;

export class TpLinkKasaPlugin extends ScryptedDeviceBase implements DeviceDiscovery, DeviceProvider, DeviceCreator, Settings {
    storageSettings = new StorageSettings(this, {
        transport: {
          title: "Transport",
          type: "string",
          placeholder: "udp",
          choices: ["tcp", "udp"],
          description: "The transport protocol for devices.",
          onPut: () => this.connect()
        },
        timeout: {
          title: "Timeout",
          type: "number",
          placeholder: 10000,
          description: "The timeout in miliseconds.",
          onPut: () => this.connect()
        },
        broadcast: {
          title: "Broadcast",
          type: "string",
          placeholder: "255.255.255.255",
          description: "UDP broadcast address.",
          onPut: () => this.connect()
        },
        apiLogLevel: {
          title: "Log Level",
          type: "string",
          placeholder: "warn",
          choices: ['trace', 'debug', 'info', 'warn', 'error', 'silent'],
          description: "Change this if you need more information transmitted in the log..",
          onPut: () => this.connect()
        }
    });

    client: TplinkClient;

    constructor(nativeId?: string) {
        super(nativeId);
        this.connect();
    }

    connect() {
        const self = this;

        if (this.client !== undefined) {
            try {
                this.console.info("Stopping discovery.");
                this.client.stopDiscovery();
            } catch (err) {
                this.console.error(err);
            }
        }
        
        this.client = new TplinkClient({
            logger: this.console,
            logLevel: this.storageSettings.values.apiLogLevel,
            defaultSendOptions: {
                timeout: this.storageSettings.values.timeout,
                transport: this.storageSettings.values.transport
            }
        });
        
        this.client.on('error', self.console.error);
        this.client.on('discovery-invalid', self.console.error);

        this.client.on('device-new', self.foundDevice);
        this.client.on('device-online', self.foundDevice);
        
        this.client.on('device-offline', async (device: TplinkDevice) => {
            const deviceAccessory = await this.getDevice(device.id);
            if (deviceAccessory !== undefined) {
                self.console.debug(`Device Offline: ${`[${device.alias}]`} %s [%s]`, deviceAccessory.name, device.deviceType, device.id, device.host, device.port);
            }
        });

        this.client.startDiscovery({
            broadcast: this.storageSettings.values.broadcast,
            filterCallback: (sysInfo) => {
                return sysInfo.deviceId != null && sysInfo.deviceId.length > 0;
            }
        });
    }

    async foundDevice(device: TplinkDevice) {
        const deviceId = device.id;

        if (deviceId === null || deviceId.length === 0) {
            this.console.error('Missing deviceId: %s', device.host);
            return;
        }

        const currentDevices = deviceManager.getNativeIds();
        if (currentDevices.includes(deviceId)) 
            return;

        const d = {
            providerNativeId: this.nativeId,
            name: device.alias,
            type: device.deviceType === 'plug' ? ScryptedDeviceType.Outlet : device.deviceType === 'bulb' ? ScryptedDeviceType.Light : ScryptedDeviceType.Unknown,
            nativeId: device.deviceId,
            interfaces: [
                ScryptedInterface.OnOff, 
                ScryptedInterface.Settings, 
                ScryptedInterface.Online, 
                ScryptedInterface.Refresh],
            info: {
                model: device.model,
                mac: device.mac,
                manufacturer: "TP-Link Kasa",
                serialNumber: device.deviceId,
                firmware: device.softwareVersion,
                version: device.hardwareVersion
            }
        };

        if (device.deviceType === 'plug') {
            d.interfaces.push(ScryptedInterface.PowerSensor);
        }
        
        if (device.deviceType === 'bulb') {
            d.interfaces.push(ScryptedInterface.ColorSettingHsv);
            d.interfaces.push(ScryptedInterface.ColorSettingRgb);
            d.interfaces.push(ScryptedInterface.ColorSettingTemperature);
        }

        await deviceManager.onDeviceDiscovered(d);
        this.console.info(`Added: [${d.name}] ${d.type} [${d.nativeId}]`);
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

    discoverDevices(duration: number): Promise<void> {
        throw new Error('Method not implemented.');
    }

    getDevice(nativeId: ScryptedNativeId) {
        throw new Error('Method not implemented.');
    }

    createDevice(settings: DeviceCreatorSettings): Promise<string> {
        throw new Error('Method not implemented.');
    }

    getSettings(): Promise<Setting[]> {
        return this.storageSettings.getSettings();
    }

    putSetting(key: string, value: SettingValue): Promise<void> {
        return this.storageSettings.putSetting(key, value);
    }
}
