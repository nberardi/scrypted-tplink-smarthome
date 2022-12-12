import { OnOff, Brightness, ColorSettingHsv, ColorSettingTemperature, ColorHsv } from "@scrypted/sdk";
import { Bulb } from "tplink-smarthome-api";
import { KasaBase } from "./KasaBase";


export class KasaBulb extends KasaBase<Bulb> implements OnOff, Brightness, ColorSettingHsv, ColorSettingTemperature {

    constructor(nativeId: string, device: Bulb) {
        super(nativeId, device);

        const lightState = device.sysInfo.light_state;

        this.on = lightState.on_off === 1;
        this.brightness = lightState.brightness;
        this.colorTemperature = lightState.color_temp;

        let hsv: ColorHsv = {
            h: lightState.hue,
            s: lightState.saturation,
            v: 100
        };
        this.hsv = hsv;
    }

    async connect(device: Bulb) {
        super.connect(device);

        const lightState = await device.lighting.getLightState();

        this.on = lightState.on_off === 1;
        this.brightness = lightState.brightness;
        this.colorTemperature = lightState.color_temp;

        let hsv: ColorHsv = {
            h: lightState.hue,
            s: lightState.saturation,
            v: 100
        };
        this.hsv = hsv;
    }

    async turnOff(): Promise<void> {
        this.device.setPowerState(false);
    }
    async turnOn(): Promise<void> {
        this.device.setPowerState(true);
    }
    async setBrightness(brightness: number): Promise<void> {
        let success = await this.device.lighting.setLightState({ brightness: brightness });
        if (success)
            this.brightness = brightness;
    }
    async setHsv(hue: number, saturation: number, value: number): Promise<void> {
        let success = await this.device.lighting.setLightState({ hue: hue, saturation: saturation, color_temp: 0 });

        if (success) {
            if (this.hsv) {
                this.hsv.h = hue;
                this.hsv.s = saturation;
                this.hsv.v = value;
            } else {
                this.hsv = {
                    h: hue,
                    s: saturation,
                    v: value
                };
            }
        }
    }
    async getTemperatureMaxK(): Promise<number> {
        const range = this.device.colorTemperatureRange;

        if (range === null)
            return 0;

        return range.max;
    }
    async getTemperatureMinK(): Promise<number> {
        const range = this.device.colorTemperatureRange;

        if (range === null)
            return 0;

        return range.min;
    }
    async setColorTemperature(kelvin: number): Promise<void> {
        let success = await this.device.lighting.setLightState({ color_temp: kelvin });
        if (success)
            this.colorTemperature = kelvin;
    }
}
