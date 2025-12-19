export interface GestureStateManagerType {
    begin: () => void;
    activate: () => void;
    fail: () => void;
    end: () => void;
    /** @internal */
    handlerTag: number;
}
declare function create(handlerTag: number): GestureStateManagerType;
export declare const GestureStateManager: {
    create: typeof create;
};
export {};
//# sourceMappingURL=gestureStateManager.d.ts.map