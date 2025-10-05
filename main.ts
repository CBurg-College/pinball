//////////////////////
//##################//
//##              ##//
//##  eserial.ts  ##//
//##              ##//
//##################//
//////////////////////

let g_init = false
let g_read: string[]
let g_write: string[]
g_read = []
g_write = []
let g_read_tmo = 0
let g_write_tmo = 0

let g_tx_dat: DigitalPin	// tx out data
let g_tx_rdy: DigitalPin	// tx out data valid
let g_tx_rcv: DigitalPin	// tx in  data received
let g_rx_dat: DigitalPin	// rx in  data
let g_rx_rdy: DigitalPin	// rx in  data valid
let g_rx_rcv: DigitalPin	// rx out data received

function initESerial() {
    pins.digitalWritePin(g_tx_rdy, 0)
    pins.digitalWritePin(g_tx_rdy, 0)
    pins.digitalWritePin(g_tx_rdy, 0)
    g_read = []
    g_write = []
}

function writeChar(char: string) {
    let ch = char.charCodeAt(0)
    let pin: number
    for (let i = 0; i < 8; i++) {
        pin = (ch & (1 << i))
        pins.digitalWritePin(g_tx_dat, pin == 0 ? 0 : 1)
        pins.digitalWritePin(g_tx_rdy, 1)
        while (!pins.digitalReadPin(g_tx_rcv)) {
            if (control.millis() > g_write_tmo) { initESerial(); return; }
        }
        pins.digitalWritePin(g_tx_rdy, 0)
        while (pins.digitalReadPin(g_tx_rcv)) {
            if (control.millis() > g_write_tmo) { initESerial(); return; }
        }
    }
}

function readChar(): string {
    let pin: number
    let ch = 0
    for (let i = 0; i < 8; i++) {
        while (!pins.digitalReadPin(g_rx_rdy)) {
            if (control.millis() > g_read_tmo) { initESerial(); return ""; }
        }
        pin = pins.digitalReadPin(g_rx_dat)
        ch |= (pin << i)
        pins.digitalWritePin(g_rx_rcv, 1)
        while (pins.digitalReadPin(g_rx_rdy)) {
            if (control.millis() > g_read_tmo) { initESerial(); return ""; }
        }
        pins.digitalWritePin(g_rx_rcv, 0)
    }
    let ret = (ch == 0 ? "" : String.fromCharCode(ch))
    return ret
}

// write strings
basic.forever(function () {
    if (!g_init) return;
    if (g_write.length > 0) {
        g_write_tmo = control.millis() + 5000
        let str = g_write.shift()
        for (let i = 0; i < str.length; i++) {
            if (control.millis() > g_write_tmo) { initESerial(); break; }
            writeChar(str[i])
        }
        writeChar(String.fromCharCode(0))
    }
})

// read strings
basic.forever(function () {
    if (!g_init) return;
    let str = ""
    let ch = ""
    if ((pins.digitalReadPin(g_rx_rdy) == 1)) { // available
        g_read_tmo = control.millis() + 5000
        do {
            ch = readChar()
            str += ch
        } while (!ch.isEmpty())
        if (control.millis() <= g_read_tmo)
            g_read.push(str)
        str = ""
    }
})

namespace ESerial {

    export function setPins(tx_dat: DigitalPin,
        tx_rdy: DigitalPin,
        tx_rcv: DigitalPin,
        rx_dat: DigitalPin,
        rx_rdy: DigitalPin,
        rx_rcv: DigitalPin) {
        g_tx_dat = tx_dat
        g_tx_rdy = tx_rdy
        g_tx_rcv = tx_rcv
        g_rx_dat = rx_dat
        g_rx_rdy = rx_rdy
        g_rx_rcv = rx_rcv

        initESerial()
        g_init = true
    }

    export function available(): boolean {
        return (g_read.length > 0)
    }

    export function write(str: string) {
        g_write.push(str)
    }

    export function read(): string {
        if (g_read.length)
            return g_read.shift()
        return ""
    }
}


//////////////////////
//##################//
//##              ##//
//##  pinball.ts  ##//
//##              ##//
//##################//
//////////////////////


let GATE1 = false
let GATE2 = false

enum COMMAND {
    SetVideo1,  // + file name
    SetVideo2,  // + file name
    PlayVideo1,
    PlayVideo2,
    SetBackgr,  // + file name
    ShowBackgr,
    ColorLed1,  // + color
    ColorLed2,  // + color
    ColorLed3,  // + color
    ThruGate1,
    ThruGate2
}

const CMDSTR = [
    "V1",  // SetVideo1 file name
    "V2",  // SetVideo2 file name
    "P1",  // PlayVideo1
    "P2",  // PlayVideo2
    "BG", // SetBackgr file name
    "PB",  // ShowBackgr,
    "L1",  // ColorLed1
    "L2",  // ColorLed2
    "L3",  // ColorLed3
    "G1",  // ThruGate1
    "G2"   // ThruGate2
]

let gate1Handler: handler
let gate2Handler: handler

basic.showIcon(IconNames.Heart)
ESerial.setPins(
    DigitalPin.P2,     // RPI GPIO 4
    DigitalPin.P12,    // RPI GPIO 10
    DigitalPin.P13,    // RPI GPIO 9
    DigitalPin.P14,    // RPI GPIO 11
    DigitalPin.P15,    // RPI GPIO 19
    DigitalPin.P16     // RPI GPIO 26
)
basic.showIcon(IconNames.Yes)

basic.forever(function () {
    if (ESerial.available()) {
        let cmd = ESerial.read()
        if ((cmd == CMDSTR[COMMAND.ThruGate1]) && gate1Handler)
            gate1Handler()
        if ((cmd == CMDSTR[COMMAND.ThruGate2]) && gate2Handler)
            gate2Handler()
    }
})

//% color="#00CC00" icon="\uf1f9"
//% block="Pinball"
//% block.loc.nl="Flipperkast"
namespace Pinball {

    export enum Gate {
        //% block="gate 1"
        //% block.loc.nl="poortje 1"
        Gate1,
        //% block="gate 2"
        //% block.loc.nl="poortje 2"
        Gate2
    }

    export enum Led {
        //% block="led 1"
        //% block.loc.nl="led 1"
        Led1,
        //% block="led 2"
        //% block.loc.nl="led 2"
        Led2,
        //% block="led 3"
        //% block.loc.nl="led 3"
        Led3
    }

    export enum Media {
        //% block="video 1"
        //% block.loc.nl="video 1"
        Video1,
        //% block="video 2"
        //% block.loc.nl="video 2"
        Video2
    }

    //% block="assign file %name to the background"
    //% block.loc.nl="wijs bestand %name toe aan de achtergrond"
    export function setBackgrFile(name: string) {
        let cmd = CMDSTR[COMMAND.SetBackgr]
        ESerial.write(cmd + name)
    }

    //% block="assign file %name to %video"
    //% block.loc.nl="wijs bestand %name toe aan %video"
    export function setVideoFile(name: string, video: Media) {
        let cmd: string
        switch (video) {
            case Media.Video1: cmd = CMDSTR[COMMAND.SetVideo1]; break;
            case Media.Video2: cmd = CMDSTR[COMMAND.SetVideo2]; break;
        }
        ESerial.write(cmd + name)
    }

    //% block="let %led shine %color"
    //% block.loc.nl="laat %led %color schijnen"
    export function ledColor(led: Led, color: Color) {
        let clr = fromColor(color)
        let cmd: string
        switch (led) {
            case Led.Led1: cmd = CMDSTR[COMMAND.ColorLed1]; break;
            case Led.Led2: cmd = CMDSTR[COMMAND.ColorLed2]; break;
            case Led.Led3: cmd = CMDSTR[COMMAND.ColorLed3]; break;
        }
        ESerial.write(cmd + clr.toString())
    }

    //% block="play %video"
    //% block.loc.nl="speel %video af"
    export function playVideo(video: Media) {
        let cmd: string
        switch (video) {
            case Media.Video1: cmd = CMDSTR[COMMAND.PlayVideo1]; break;
            case Media.Video2: cmd = CMDSTR[COMMAND.PlayVideo2]; break;
        }
        ESerial.write(cmd)
    }

    //% block="show background"
    //% block.loc.nl="toon achtergrond"
    export function showBackground() {
        ESerial.write(CMDSTR[COMMAND.ShowBackgr])
    }

    //% color="#FFCC00"
    //% block="when the ball goes through %gate"
    //% block.loc.nl="wanneer de bal door %gate gaat"
    export function onGate(gate: Gate, code: () => void): void {
        switch (gate) {
            case Gate.Gate1: gate1Handler = code; break;
            case Gate.Gate2: gate2Handler = code; break;
        }
    }
}
