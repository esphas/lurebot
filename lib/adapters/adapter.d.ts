export declare abstract class Adapter {
    abstract install(inst: Installer): Promise<Status>;
    abstract uninstall(uninst: Uninstaller): Promise<Status>;
    abstract start(): Status;
    abstract stop(): Status;
    abstract hears(wind: Wind, ...rain: Drop[]): Status;
}
