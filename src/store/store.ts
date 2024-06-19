import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import animationReducer from './animationSlice'; // We'll create this slice later
import { Animation, Layer } from '../types';

const store = configureStore({
    reducer: {
        animation: animationReducer,
    },
});

export type RootState = {
    animation: {
        selectedLayerIndex: any;
        animationID: string;
        animationName: string;
        currentAnimation: Animation | null;
        currentFrame?: number;
        currentLayer?: Layer | null;
        loadThrough?: string;
    };
};
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
