import { OnOff, Brightness } from "@scrypted/sdk";
import { Plug } from "tplink-smarthome-api";
import { KasaBase } from "./KasaBase";


export class KasaPlug extends KasaBase<Plug> implements OnOff, Brightness {

    constructor(nativeId: string, device: Plug) {
        super(nativeId, device);

        this.on = device.sysInfo.relay_state === 1;
        this.brightness = device.sysInfo.brightness;
    }

    async connect(device: Plug) {
        super.connect(device);

        this.on = device.sysInfo.relay_state === 1;
        this.brightness = device.sysInfo.brightness;
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
