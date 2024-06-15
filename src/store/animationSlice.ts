import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Animation, Transformations } from '../types';
import update from 'immutability-helper';

interface AnimationState {
    animationID: string;
    animationName?: string;
    currentAnimation: Animation | null;
    currentFrame: number;
    currentLayer: number | null;
    loadThrough: string;
}

interface UpdateKeyframeValuePayload {
    layerIndex: number;
    keyframeIndex: number;
    newValue: number;
}

interface UpdateLayerPropertyPayload {
    layerIndex: number;
    propertyName: string;
    newValue: number | number[];
    currentFrame: number | undefined;
}

const initialState: AnimationState = {
    animationID: '',
    animationName: '',
    currentAnimation: null,
    currentFrame: 0,
    currentLayer: null,
    loadThrough: '',
};

const animationSlice = createSlice({
    name: 'animation',
    initialState,
    reducers: {
        setAnimation: (state, action: PayloadAction<Animation>) => {
            state.currentAnimation = action.payload;
        },
        setAnimationID: (state, action: PayloadAction<string>) => {
            state.animationID = action.payload;
        },
        setAnimationName: (state, action: PayloadAction<string>) => {
            state.animationName = action.payload;
        },
        updateCurrentLayer: (state, action: PayloadAction<number | null>) => {
            state.currentLayer = action.payload;
        },
        removeLayer: (state, action: PayloadAction<number>) => {
            const index = action.payload;  // index of the array layers[] (start from 0)
            if (state.currentAnimation && index >= 0 && index < state.currentAnimation.layers.length) {
                state.currentAnimation.layers.splice(index, 1);
                if (state.currentAnimation.layers.length === 0) {
                    state.currentFrame = 0; // Reset currentFrame when all layers are deleted
                    state.currentLayer = null; // Reset currentLayer when all layers are deleted
                }
            }
        },
        updateKeyframeValue: (state, action: PayloadAction<UpdateKeyframeValuePayload>) => {
            const { layerIndex, keyframeIndex, newValue } = action.payload;
            return update(state, {
                currentAnimation: {
                    layers: {
                        [layerIndex]: {
                            ks: {
                                k: {
                                    [keyframeIndex]: {
                                        s: { 0: { $set: newValue } },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        },
        updateLayerProperty: (state, action: PayloadAction<UpdateLayerPropertyPayload>) => {
            const { layerIndex, propertyName, newValue, currentFrame } = action.payload;
            const layer = state.currentAnimation?.layers[layerIndex - 1];
            const transformProperty = layer?.ks[propertyName as keyof Transformations];
            if (layer && layer.ks && transformProperty) {
                if (Array.isArray(newValue)) {
                    if (typeof transformProperty.k[0] === 'number') {  // Array of numbers (number[])
                        (transformProperty.k)[0] = newValue[0];  // Update the first value
                        (transformProperty.k)[1] = newValue[1];  // Update the second value
                        (transformProperty.k)[2] = newValue[2];  // Update the third value
                    } else if (typeof transformProperty.k[0] === 'object') {  // Array of objects (keyframes)
                        // find the keyframe index that matches the current frame
                        const keyframeIndex = transformProperty.k.findIndex((keyframe: any) => keyframe.t === currentFrame);
                        if (keyframeIndex !== -1) {
                            (transformProperty.k[keyframeIndex].s)[0] = newValue[0];  // Update the first value
                            (transformProperty.k[keyframeIndex].s)[1] = newValue[1];  // Update the second value
                            (transformProperty.k[keyframeIndex].s)[2] = newValue[2];  // Update the third value
                        }
                    }
                    
                } else {
                    transformProperty.k = newValue;
                }
            }
        },
        updateScrubberPosition: (state, action: PayloadAction<number>) => {
            state.currentFrame = action.payload;
        },
        updateLoadThrough: (state, action: PayloadAction<string>) => {
            state.loadThrough = action.payload;
        },
    },
});

export const { 
    setAnimation, 
    setAnimationID, 
    setAnimationName, 
    updateCurrentLayer, 
    removeLayer, 
    updateKeyframeValue, 
    updateLayerProperty, 
    updateScrubberPosition, 
    updateLoadThrough 
} = animationSlice.actions;
export default animationSlice.reducer;
