/**
 * Det lille av Chrome-API-et utvidelsen bruker. Skrevet for hånd i stedet for å trekke inn
 * @types/chrome for fire kall.
 */
declare namespace chrome {
  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }
    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    function create(properties: { url: string }): Promise<Tab>;
  }
  namespace scripting {
    interface InjectionResult<T> {
      result?: T;
    }
    function executeScript(injection: { target: { tabId: number }; files: string[] }): Promise<InjectionResult<unknown>[]>;
    function executeScript<T>(injection: { target: { tabId: number }; func: () => T }): Promise<InjectionResult<T>[]>;
  }
}
