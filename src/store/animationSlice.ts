/* eslint-disable react-hooks/rules-of-hooks */
import React, { useContext } from 'react';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Animation, Layer, LayerChangeMessage, PropertyChangeMessage, Transformations } from '../types';
import update from 'immutability-helper';
import { RootState } from './store';

interface AnimationState {
    animationID: string;
    animationName?: string;
    currentAnimation: Animation | null;
    currentFrame: number;
    currentLayer: number | null;
    loadThrough: string;
    selectedLayerIndex?: number | null;
}

interface UpdateKeyframeValuePayload {
    layerIndex: number;
    keyframeIndex: number;
    newValue: number;
    propertyName: string;
    extra?: any;
}

interface UpdateLayerPropertyPayload {
    layerIndex: number;
    propertyName: string;
    newValue: number | number[];
    currentFrame: number | undefined;
    index?: number;
    extra?: any;
}

const initialState: AnimationState = {
    animationID: '',
    animationName: '',
    currentAnimation: null,
    currentFrame: 0,
    currentLayer: null,
    loadThrough: '',
};

export const addLayer = createAsyncThunk<Animation, Layer, { state: RootState, extra: WebSocket }>(
    "animation/addLayer",
    async (layer, { getState, extra: ws }) => {
        const state = getState();

        // Use immer to create a new state object with the added layer
        const newAnimation = {
            ...state.animation.currentAnimation,
            layers: [...state.animation.currentAnimation?.layers || [], layer],
        };
        
        // Send a message to other clients via WebSocket
        if (ws) {
            const message: LayerChangeMessage = {
                type: "layerAdded",
                payload: (layer as any),
            };
            ws.send(JSON.stringify(message));
        }

        return (newAnimation as Animation);
    }
);

export const removeLayer = createAsyncThunk(
    "animation/removeLayer",
    async (layerIndex: number, { dispatch, getState, extra: ws }) => {
        const state = getState() as RootState;

        // Use immer to create a new state object with the layer removed
        const newAnimation = {
            ...state.animation.currentAnimation,
            layers: state.animation.currentAnimation!.layers.filter((_, i) => i !== layerIndex),
        };

        // Send a message to other clients via WebSocket
        if (ws) {
            const message: LayerChangeMessage = {
                type: "layerDeleted",
                payload: ({ layerIndex } as any),
            };
            (ws as WebSocket).send(JSON.stringify(message));
        }

        // Update selectedLayerIndex if necessary
        let newSelectedLayerIndex = state.animation.selectedLayerIndex;
        if (newSelectedLayerIndex === layerIndex) {
            newSelectedLayerIndex = null;
        } else if (newSelectedLayerIndex !== null && newSelectedLayerIndex > layerIndex) {
            newSelectedLayerIndex--;
        }

        dispatch(selectLayer(newSelectedLayerIndex));

        return newAnimation as Animation;
    }
);

export const reorderLayers = createAsyncThunk(
    "animation/reorderLayers",
    async (
        { sourceIndex, destinationIndex }: { sourceIndex: number; destinationIndex: number },
        { getState, extra: ws }
    ) => {
        const state = getState() as RootState;

        // Use immer to create a new state object with the layers reordered
        const newLayers = Array.from(state.animation.currentAnimation!.layers);
        const [removed] = newLayers.splice(sourceIndex, 1);
        newLayers.splice(destinationIndex, 0, removed);
        const newAnimation = {
            ...state.animation.currentAnimation,
            layers: newLayers,
        };

        // Send a message to other clients via WebSocket
        if (ws) {
            const message: LayerChangeMessage = {
                type: "layerReordered",
                payload: ({ sourceIndex, destinationIndex } as any),
            };
            (ws as WebSocket).send(JSON.stringify(message));
        }

        return newAnimation;
    }
);

export const updateKeyframeValue = createAsyncThunk(
    "animation/updateKeyframeValue",
    async (
        { layerIndex, keyframeIndex, newValue, propertyName }: UpdateKeyframeValuePayload,
        { getState, extra: ws }
    ) => {
        const state = getState() as RootState;

        // Use immer to create a new state object with the updated keyframe value
        const newAnimation = update(state.animation.currentAnimation!, {
            layers: {
                [layerIndex]: {
                    ks: {
                        [propertyName]: {
                            k: {
                                [keyframeIndex]: {
                                    s: { $set: newValue },
                                },
                            },
                        },
                    },
                },
            },
        });

        // Send a message to other clients via WebSocket
        if (ws) {
            const message: PropertyChangeMessage = {
                type: "updateKeyframeValue",
                payload: { layerIndex, keyframeIndex, newValue, propertyName },
            };
            (ws as WebSocket).send(JSON.stringify(message));
        }

        return newAnimation;
    }
);

export const updateLayerProperty = createAsyncThunk(
    "animation/updateLayerProperty",
    async (
        { layerIndex, propertyName, newValue, index }: UpdateLayerPropertyPayload,
        { getState, extra: ws }
    ) => {
        const state = getState() as RootState;

        const newAnimation = update(state.animation.currentAnimation!, {
            layers: {
                [layerIndex]: {
                    ks: {
                        [propertyName]: {
                            k: {
                                $apply: (k: any) => {
                                    if (Array.isArray(k && typeof k[0] === 'number')) {
                                        // If k is an array of numbers, update the specific index
                                        const newNumberArray = [...k];
                                        newNumberArray[index || 0] = newValue;
                                        return newNumberArray[index || 0];
                                    } else if (Array.isArray(k && typeof k[0] === 'object')) {
                                        // If k is an arry of keyframes
                                        const keyframeIndex = k.findIndex((keyframe: any) => keyframe.t === state.animation.currentFrame);
                                        if (keyframeIndex !== -1) {
                                            const newKeyframes = [...k];
                                            newKeyframes[keyframeIndex].s[index || 0] = newValue;
                                            return newKeyframes;
                                        } else {
                                            return k;
                                        }
                                    } else {
                                        return newValue;
                                    }
                                },
                            },
                        },
                    },
                },
            },
        });

        if (ws) {
            const message: PropertyChangeMessage = {
                type: "updateLayerProperty",
                payload: { layerIndex, propertyName, newValue, index },
            };
            (ws as WebSocket).send(JSON.stringify(message));
        }

        return newAnimation;
    }
);

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
        selectLayer(state, action: PayloadAction<number | null>) {
            state.selectedLayerIndex = action.payload;
        },
        updateScrubberPosition: (state, action: PayloadAction<number>) => {
            state.currentFrame = action.payload;
        },
        updateLoadThrough: (state, action: PayloadAction<string>) => {
            state.loadThrough = action.payload;
        },
    },
    extraReducers(builder) {
        builder
            .addCase(addLayer.fulfilled, (state, action) => {
                (state as any).currentAnimation = action.payload;

                const ws = action.meta.arg.extra; // Get the ws object from extra
                if (ws) {
                    const message: LayerChangeMessage = {
                        type: "layerAdded",
                        payload: (action.payload as any),
                    };
                    ws.send(JSON.stringify(message));
                }
            })
            // ... add cases for removeLayer and reorderLayers
            .addCase(removeLayer.fulfilled, (state, action) => {
                (state as any).currentAnimation = action.payload;

                const ws = (action.meta.arg as any).extra; // Get the ws object from extra
                if (ws) {
                    const message: LayerChangeMessage = {
                        type: 'layerDeleted',
                        payload: ({ layerIndex: action.payload } as any),
                    };
                    ws.send(JSON.stringify(message));
                }
            })
            .addCase(reorderLayers.fulfilled, (state, action) => {
                const { sourceIndex, destinationIndex } = action.payload;
                if (state.currentAnimation) {
                    const newLayers = Array.from(state.currentAnimation.layers);
                    const [removed] = newLayers.splice((sourceIndex as number), 1);
                    newLayers.splice((destinationIndex as number), 0, removed);
                    state.currentAnimation.layers = newLayers;
                }

                const ws = (action.meta.arg as any).extra;
                if (ws) {
                    const message: LayerChangeMessage = {
                        type: 'layerReordered',
                        payload: (action.payload as any),
                    };
                    ws.send(JSON.stringify(message));
                }
            })
            .addCase(updateKeyframeValue.fulfilled, (state, action) => {
                state.currentAnimation = action.payload;
                const ws = action.meta.arg.extra;
                if (ws) {
                    const message: PropertyChangeMessage = {
                        type: 'propertyChange',
                        payload: (action.payload as any),
                    };
                    ws.send(JSON.stringify(message));
                }
            })
            .addCase(updateLayerProperty.fulfilled, (state, action) => {
                state.currentAnimation = action.payload as any;
                const ws = action.meta.arg.extra;
                if (ws) {
                    const message: PropertyChangeMessage = {
                        type: 'propertyChange',
                        payload: (action.payload as any),
                        timestamp: Date.now(),
                    };
                    ws.send(JSON.stringify(message));
                }
            });
    },
});

export const { 
    setAnimation, 
    setAnimationID, 
    setAnimationName, 
    updateCurrentLayer, 
    selectLayer, 
    updateScrubberPosition, 
    updateLoadThrough 
} = animationSlice.actions;
export default animationSlice.reducer;
