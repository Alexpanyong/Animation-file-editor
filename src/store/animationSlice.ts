/* eslint-disable react-hooks/rules-of-hooks */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Animation, AnimationState, Layer, LayerChangeMessage, PropertyChangeMessage, UpdateKeyframeValuePayload, UpdateLayerPropertyPayload, WebSocketMessage } from '../types';
import update from 'immutability-helper';
import { RootState } from './store';


const initialState: AnimationState = {
    animationID: '',
    animationName: '',
    currentAnimation: null,
    currentFrame: 0,
    currentLayer: null,
    loadThrough: '',
    selectedLayerIndex: null,  // index of the array, layers.map((layer, index) => {...}), (start from 0)
};

function sendWebSocketMessage(ws: WebSocket, type: string, payload: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = { type, payload };
        ws.send(JSON.stringify(message));
    }
}

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
    async (index: number, { dispatch, getState, extra: ws }) => {  // index is the index of layers[] array (start from 0)
        const state = getState() as RootState;

        // Use immer to create a new state object with the layer removed
        const newAnimation = {
            ...state.animation.currentAnimation,
            layers: state.animation.currentAnimation!.layers.filter((_, i) => i !== index),
        };

        // Send a message to other clients via WebSocket
        if (ws) {
            const message: LayerChangeMessage = {
                type: "layerDeleted",
                payload: ({ index } as any),
            };
            (ws as WebSocket).send(JSON.stringify(message));
        }

        // Update selectedLayerIndex if necessary
        let newSelectedLayerIndex = state.animation.selectedLayerIndex;  // TODO: Check this selectedLayerIndex
        if (newSelectedLayerIndex === index) {
            newSelectedLayerIndex = null;
        } else if (newSelectedLayerIndex !== null && newSelectedLayerIndex > index) {
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
                [layerIndex]: {  // layerIndex is the index of the layers[] array (start from 0)
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
        { layerIndex, propertyName, newValue, index, currentFrame }: UpdateLayerPropertyPayload,
        { getState, extra: ws }
    ) => {
        const state = getState() as RootState;

        const newAnimation = update(state.animation.currentAnimation!, {
            layers: {
                [layerIndex]: {  // layerIndex is the index of the layers[] array (start from 0)
                    ks: {
                        [propertyName]: {
                            k: {
                                $apply: (k: any) => {
                                    console.log(`.... ks.${propertyName}.k (previous):`, k);
                                    if (Array.isArray(k) && typeof k[0] === 'number') {
                                        // If k is an array of numbers, update the specific index
                                        const newNumberArray = [...k];
                                        newNumberArray[index || 0] = newValue;
                                        console.log(`.... ks.${propertyName}.k (current - Array of numbers):`, newNumberArray);
                                        return newNumberArray;
                                    } else if (Array.isArray(k) && typeof k[0] === 'object') {
                                        // If k is an arry of keyframes
                                        const keyframeIndex = k.findIndex((keyframe) => keyframe.t === state.animation.currentFrame);
                                        if (keyframeIndex !== -1) {
                                            // The current frame is a keyframe
                                            const newKeyframes = [...k];
                                            newKeyframes[keyframeIndex].s[index || 0] = newValue;
                                            console.log(`.... ks.${propertyName}.k (current - Keyframe value):`, newKeyframes);
                                            return newKeyframes;
                                        } else {
                                            // The current frame is not a keyframe
                                            console.log(`.... ks.${propertyName}.k (current - Frame value):`, k);
                                            return k;
                                        }
                                    } else {
                                        console.log(`.... ks.${propertyName}.k (current - single number):`, newValue);
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
        updateCurrentLayer: (state, action: PayloadAction<Layer | null>) => {
            state.currentLayer = action.payload;
        },
        selectLayer(state, action: PayloadAction<number | null>) {
            state.selectedLayerIndex = action.payload;
            sendWebSocketMessage((action as any).meta?.arg?.extra, 'selectLayer', action.payload);
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
                state.currentAnimation = action.payload;
                sendWebSocketMessage(action.meta.arg.extra, 'layerAdded', action.payload);
            })
            // ... add cases for removeLayer and reorderLayers
            .addCase(removeLayer.fulfilled, (state, action) => {
                state.currentAnimation = action.payload;
                sendWebSocketMessage((action.meta.arg as any).extra, 'layerDeleted', action.payload);
            })
            .addCase(reorderLayers.fulfilled, (state, action) => {
                const { sourceIndex, destinationIndex } = action.payload;
                if (state.currentAnimation) {
                    const newLayers = Array.from(state.currentAnimation.layers);
                    const [removed] = newLayers.splice((sourceIndex as number), 1);
                    newLayers.splice((destinationIndex as number), 0, removed);
                    state.currentAnimation.layers = newLayers;
                }
                sendWebSocketMessage((action.meta.arg as any).extra, 'layerReordered', action.payload);
            })
            .addCase(updateKeyframeValue.fulfilled, (state, action) => {
                state.currentAnimation = action.payload;
                sendWebSocketMessage(action.meta.arg.extra, 'propertyChange', action.payload);
            })
            .addCase(updateLayerProperty.fulfilled, (state, action) => {
                state.currentAnimation = action.payload as any;
                sendWebSocketMessage(action.meta.arg.extra, 'propertyChange', action.payload);
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
