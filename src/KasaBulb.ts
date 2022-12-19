import { OnOff, Brightness, ColorSettingHsv, ColorSettingTemperature, ColorHsv } from "@scrypted/sdk";
import { Bulb, LightState } from "tplink-smarthome-api";
import { KasaBase } from "./KasaBase";
import { BulbSysinfoLightState } from "tplink-smarthome-api/lib/bulb";


export class KasaBulb extends KasaBase<Bulb> implements OnOff, Brightness, ColorSettingHsv, ColorSettingTemperature {

    constructor(nativeId: string) {
        super(nativeId);
    }

    refresh(lightState: LightState) {
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

    connect(device: Bulb) {
        super.connect(device);

        const self = this;

        const lightState = device.sysInfo.light_state;
        this.refresh(lightState);

        this.device.on("lightstate-on", (ls: LightState) => {
            self.console.info(`Light On: [${device.alias}] ${device.deviceType} [${device.id}]`);
        });

        this.device.on("lightstate-off", (ls: LightState) => {
            self.console.info(`Light Off: [${device.alias}] ${device.deviceType} [${device.id}]`);
        });

        this.device.on("lightstate-change", (ls: LightState) => {
            self.refresh(ls);
        });

        this.device.on("lightstate-update", (ls: LightState) => {
            self.refresh(ls);
        });

        this.device.on("lightstate-sysinfo-on", (ls: BulbSysinfoLightState) => {
            self.console.info(`Light On: [${device.alias}] ${device.deviceType} [${device.id}]`);
        });

        this.device.on("lightstate-sysinfo-off", (ls: BulbSysinfoLightState) => {
            self.console.info(`Light Off: [${device.alias}] ${device.deviceType} [${device.id}]`);
        });

        this.device.on("lightstate-sysinfo-change", (ls: BulbSysinfoLightState) => {
            self.refresh(ls);
        });

        this.device.on("lightstate-sysinfo-update", (ls: BulbSysinfoLightState) => {
            self.refresh(ls);
        });
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
