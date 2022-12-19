import { OnOff, Brightness, PowerSensor } from "@scrypted/sdk";
import { Plug } from "tplink-smarthome-api";
import { KasaBase } from "./KasaBase";
import { off } from "process";


export class KasaPlug extends KasaBase<Plug> implements OnOff, PowerSensor, Brightness {

    constructor(nativeId: string) {
        super(nativeId);
    }

    connect(device: Plug) {
        super.connect(device);

        const self = this;

        this.on = device.sysInfo.relay_state === 1;
        this.brightness = device.sysInfo.brightness;

        this.device.on("power-on", () => {
            self.console.info(`Power On: [${device.alias}] ${device.deviceType} [${device.id}]`);
        });

        this.device.on("power-off", () => {
            self.console.info(`Power Off: [${device.alias}] ${device.deviceType} [${device.id}]`);
        });

        this.device.on("power-update", (value: boolean) => {
            self.on = value;
        });

        this.device.on("in-use", () => {
            self.console.info(`In Use: [${device.alias}] ${device.deviceType} [${device.id}]`);

            self.powerDetected = true;
        });

        this.device.on("not-in-use", () => {
            self.console.info(`Not In Use: [${device.alias}] ${device.deviceType} [${device.id}]`);

            self.powerDetected = false;
        });

        this.device.on("in-use-update", (value: boolean) => {
            self.powerDetected = value;
        });
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
