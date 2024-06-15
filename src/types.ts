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
    a: number;
    k: number | number[] | K | any[] | any;
    ix: number;
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
}

export interface Marker {
    cm: string;
    tm: number;
    dr: number;
}
