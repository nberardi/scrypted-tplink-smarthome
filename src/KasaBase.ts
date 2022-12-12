import { ScryptedDeviceBase, Online, Settings, Refresh, Setting, SettingValue } from "@scrypted/sdk";
import { StorageSettingsDevice } from '@scrypted/sdk/storage-settings';
import { Device as TplinkDevice } from "tplink-smarthome-api";

export class KasaBase<T extends TplinkDevice> extends ScryptedDeviceBase implements Online, Settings, Refresh, StorageSettingsDevice {

    device: T;

    constructor(nativeId: string, device: T) {
        super(nativeId);

        this.device = device;
        this.online = device.status === "online";
    }

    async connect(device: T) {
        this.device = device;
        this.online = device.status === "online";
    }

    getSettings(): Promise<Setting[]> {
        throw new Error("Method not implemented.");
    }
    putSetting(key: string, value: SettingValue): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getRefreshFrequency(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    refresh(refreshInterface: string, userInitiated: boolean): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
