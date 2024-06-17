/* eslint-disable react-hooks/rules-of-hooks */
import React, { useContext } from 'react';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Animation, Layer, LayerChangeMessage, PropertyChangeMessage, Transformations } from '../types';
import update from 'immutability-helper';
import { WebSocketContext } from '../WebSocketProvider';
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
                                    if (Array.isArray(k)) {
                                        // If k is already an array, update the specific index
                                        const newKeyframes = [...k];
                                        newKeyframes[index || 0] = { s: newValue };
                                        return newKeyframes;
                                    } else {
                                        // If k is a number, create a new array with the updated value
                                        return [{ s: newValue }];
                                    }
                                },
                                // 0: {
                                //     s: {
                                //         $apply: (s: any) => {
                                //             if (Array.isArray(s)) {
                                //                 // If s is already an array, update the specific index
                                //                 const newScale = [...s];
                                //                 newScale[index || 0] = newValue;
                                //                 return newScale;
                                //             } else {
                                //                 // If s is a number, create a new array with the updated value
                                //                 return [newValue, newValue, newValue]; // Ensure uniform scaling
                                //             }
                                //         },
                                //     },
                                // },
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
        // addLayer: (state, action: PayloadAction<Layer>) => {
        //     state.currentAnimation?.layers.push(action.payload);
        //     if (ws) {
        //         const message: LayerChangeMessage = {
        //             type: 'layerAdded',
        //             payload: action.payload,
        //         };
        //         ws.send(JSON.stringify(message));
        //     }
        // },
        // removeLayer: (state, action: PayloadAction<number>) => {
        //     const index = action.payload;  // index of the array layers[] (start from 0)
        //     if (state.currentAnimation && index >= 0 && index < state.currentAnimation.layers.length) {
        //         state.currentAnimation.layers.splice(index, 1);
        //         if (state.currentAnimation.layers.length === 0) {
        //             state.currentFrame = 0; // Reset currentFrame when all layers are deleted
        //             state.currentLayer = null; // Reset currentLayer when all layers are deleted
        //         }
        //     }
        //     if (ws) {
        //         const message: LayerChangeMessage = {
        //             type: 'layerDeleted',
        //             payload: { layerIndex: action.payload },
        //         };
        //         ws.send(JSON.stringify(message));
        //     }
        // },
        // reorderLayers: (state, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) => {
        //     if (ws) {
        //         const message: LayerChangeMessage = {
        //             type: 'layerReordered',
        //             payload: action.payload,
        //         };
        //         ws.send(JSON.stringify(message));
        //     }
        // },
        // updateKeyframeValue: (state, action: PayloadAction<UpdateKeyframeValuePayload>) => {
        //     const { layerIndex, keyframeIndex, newValue } = action.payload;
        //     return update(state, {
        //         currentAnimation: {
        //             layers: {
        //                 [layerIndex]: {
        //                     ks: {
        //                         k: {
        //                             [keyframeIndex]: {
        //                                 s: { 0: { $set: newValue } },
        //                             },
        //                         },
        //                     },
        //                 },
        //             },
        //         },
        //     });
        // },
        // updateLayerProperty: (state, action: PayloadAction<UpdateLayerPropertyPayload>) => {
        //     const { layerIndex, propertyName, newValue, currentFrame } = action.payload;
        //     const layer = state.currentAnimation?.layers[layerIndex - 1];
        //     const transformProperty = layer?.ks[propertyName as keyof Transformations];
        //     if (layer && layer.ks && transformProperty) {
        //         if (Array.isArray(newValue)) {
        //             if (typeof transformProperty.k[0] === 'number') {  // Array of numbers (number[])
        //                 (transformProperty.k)[0] = newValue[0];  // Update the first value
        //                 (transformProperty.k)[1] = newValue[1];  // Update the second value
        //                 (transformProperty.k)[2] = newValue[2];  // Update the third value
        //             } else if (typeof transformProperty.k[0] === 'object') {  // Array of objects (keyframes)
        //                 // find the keyframe index that matches the current frame
        //                 const keyframeIndex = transformProperty.k.findIndex((keyframe: any) => keyframe.t === currentFrame);
        //                 if (keyframeIndex !== -1) {
        //                     (transformProperty.k[keyframeIndex].s)[0] = newValue[0];  // Update the first value
        //                     (transformProperty.k[keyframeIndex].s)[1] = newValue[1];  // Update the second value
        //                     (transformProperty.k[keyframeIndex].s)[2] = newValue[2];  // Update the third value
        //                 }
        //             }
                    
        //         } else {
        //             transformProperty.k = newValue;
        //         }
        //     }
        // },
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
                console.log("++++++______+++ updateLayerProperty.fulfilled:", action.payload);
                state.currentAnimation = action.payload;
                const ws = action.meta.arg.extra;
                if (ws) {
                    const message: PropertyChangeMessage = {
                        type: 'propertyChange',
                        payload: (action.payload as any),
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
    // removeLayer, 
    // updateKeyframeValue, 
    // updateLayerProperty, 
    updateScrubberPosition, 
    updateLoadThrough 
} = animationSlice.actions;
export default animationSlice.reducer;
