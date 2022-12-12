import { ScryptedDeviceBase, Online, Settings, Refresh, OnOff, Setting, SettingValue, Brightness, ColorSettingHsv, ColorSettingRgb, ColorSettingTemperature } from "@scrypted/sdk";
import { StorageSettingsDevice } from '@scrypted/sdk/storage-settings';
import { Bulb, Device as TplinkDevice, Plug} from "tplink-smarthome-api";

export class KasaBase<T extends TplinkDevice> extends ScryptedDeviceBase implements Online, Settings, Refresh, StorageSettingsDevice {

    device: T;

    constructor(nativeId: string) {
        super(nativeId);
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

export class KasaBulb extends KasaBase<Bulb> implements OnOff, Brightness, ColorSettingHsv, ColorSettingRgb, ColorSettingTemperature {
    async connect(device: Bulb) {
        super.connect(device);
        
        this.on = await device.getPowerState();
    }

    async turnOff(): Promise<void> {
        this.device.setPowerState(false);
    }
    async turnOn(): Promise<void> {
        this.device.setPowerState(true);
    }
    setBrightness(brightness: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    setHsv(hue: number, saturation: number, value: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    setRgb(r: number, g: number, b: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getTemperatureMaxK(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getTemperatureMinK(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    setColorTemperature(kelvin: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export class KasaPlug extends KasaBase<Plug> implements OnOff, Brightness {

    async connect(device: Plug) {
        super.connect(device);
        
        this.on = await device.getPowerState();
        this.brightness = device.dimmer.brightness;
    }

    async turnOff(): Promise<void> {
        this.device.setPowerState(false);
    }
    async turnOn(): Promise<void> {
        this.device.setPowerState(true);
    }
    async setBrightness(brightness: number): Promise<void> {
        this.device.dimmer.setBrightness(brightness);
    }
}
