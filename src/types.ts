export interface Animation {
    id: string;
    name: string;
    url: string;
    jsonUrl: string;
    v: string;
    fr: number;
    ip: string;
    op: number;
    w: number;
    h: number;
    nm: string;
    ddd: number;
    assets: Asset[];
    layers: Layer[] | any[];
    markers: Marker[];
    props: any;
    currentFrame?: number;
    layerIndex?: number;
    propertyName?: string;
    newValue?: any;
    sourceIndex?: number;
    destinationIndex?: number;
}

export interface Asset {
    id: string;
    u: string;
    p: string;
    e: number;
}

export interface K {
    [key: string]: kLevel2 | any[] | any;
}

export interface kLevel2 {
    i?: any[] | any;
    o?: any[] | any;
    n?: any[] | any;
    t?: any[] | any;
    s?: any[] | any;
    e?: any[] | any;
    to?: any[] | any;
    ti?: any[] | any;
}

export interface TransformProperties {
    s?: number | number[] | any[] | any;
    t?: number;
    a?: number;
    k?: number | number[] | K | any[] | any;
    ix?: number;
}

export interface Transformations {
    o?: TransformProperties;  // Opacity
    p?: TransformProperties;  // Position
    a?: TransformProperties;  // Anchor Point
    s?: TransformProperties;  // Scale
    r?: TransformProperties;  // Rotation
}

export interface Layer {
    ddd: number;
    ind: number;
    ty: number;
    nm: string;
    sr: number;
    ks: Transformations;
    ao: number;
    shapes: any[]; // Replace 'any' with specific shape types
    ip: number;
    op: number;
    st: number;
    bm: number;
    extra?: any;
    sourceIndex?: number;
    destinationIndex?: number;
}

export interface Marker {
    cm: string;
    tm: number;
    dr: number;
}



// WebSocket message types)
export interface WebSocketMessage {
    type: string;
    payload: any;
}

// Property change message
export interface PropertyChangeMessage extends WebSocketMessage {
    type: 'propertyChange' | 'updateKeyframeValue' | 'updateLayerProperty';
    payload: {
        layerIndex: number;
        propertyName: string;
        newValue: any;
        index?: number | null | undefined;
        keyframeIndex?: number | null | undefined;
        layer?: Layer | any;
    };
    timestamp?: number;
}

// Layer change messages (add, delete, reorder)
export interface LayerChangeMessage extends WebSocketMessage {
    type: 'layerAdded' | 'layerDeleted' | 'layerReordered';
    payload: {
        layerIndex: number | any;
        propertyName: string;
        newValue: any;
        index?: number | null | undefined;
        sourceIndex?: number | null | undefined;
        destinationIndex?: number | null | undefined;
        layer?: Layer | any;
    };
}
