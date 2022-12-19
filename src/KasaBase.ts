import { ScryptedDeviceBase, Online, Settings, Refresh, Setting, SettingValue } from "@scrypted/sdk";
import { StorageSettings } from "@scrypted/sdk/storage-settings";
import { Device as TplinkDevice } from "tplink-smarthome-api";

export class KasaBase<T extends TplinkDevice> extends ScryptedDeviceBase implements Online, Settings {

    storageSettings = new StorageSettings(this, {
        ipAddress: {
            title: "IP Address",
            type: "string",
            placeholder: "192.168.1.XX",
            readonly: true,
            description: "The IP Address of the device on your local network."
        },
        port: {
            title: "Port",
            type: "number",
            placeholder: 9999,
            value: 9999,
            readonly: true,
            description: "The port defaults to 9999, but can be overriden.",
        }
    });

    device: T;

    constructor(nativeId: string) {
        super(nativeId);
    }

    connect(device: T) {
        if (this.device) {
            this.device.removeAllListeners();
        }

        this.device = device;
        this.online = device.status === "online";

        this.storageSettings.values.ipAddress = device.host;
        this.storageSettings.values.port = device.port;
    }

    getSettings(): Promise<Setting[]> {
        return this.storageSettings.getSettings();
    }

    putSetting(key: string, value: SettingValue): Promise<void> {
        return this.storageSettings.putSetting(key, value);
    }
}
