import React, { useEffect, useRef, useState } from 'react';
import './Editor.scss';
import Timeline from './Timeline';
import AnimationCanvas from './AnimationCanvas';
import PropertiesPanel from './PropertiesPanel';
import { useAppDispatch, useAppSelector } from '../store/store';
import { removeLayer, setAnimation, updateCurrentLayer, updateKeyframeValue, updateLayerProperty, updateScrubberPosition } from '../store/animationSlice';
import FileUpload from './FileUpload';
import ApiFetchLoader from './ApiFetchLoader';
import { WebSocketContext } from '../WebSocketProvider';

const Editor: React.FC = () => {
    const timelineContentRef = useRef<HTMLDivElement>(null);
    const currentAnimation = useAppSelector((state) => state.animation.currentAnimation);
    const animationName = useAppSelector((state) => state.animation.animationName);
    const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null);
    const dispatch = useAppDispatch();

    const ws = React.useContext(WebSocketContext);


    const handleLayerClick = (index: number, layerIndex: number) => {
        setSelectedLayerIndex(index);  // index of the array, layers.map((layer, index) => {...}), (start from 0)
        dispatch(updateCurrentLayer(layerIndex));  // Update the current layer in Redux (index of the layer itself (layer.ind))
    };


    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080'); // Connect to your WebSocket server

        ws.onopen = () => {
            console.log('WebSocket connection opened');
        };

        ws.onmessage = (event) => {
            console.log('Received message:', event.data);
            const message = JSON.parse(event.data);
            switch (message.type) {
                case 'propertyChange':
                    // Dispatch Redux action to update the property
                    dispatch(updateLayerProperty(message.payload));
                    break;
                // Add cases for other message types
                default:
                    console.error('Unknown message type:', message.type);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        return () => {
            ws.close(); // Close the connection when the component unmounts
        };
    }, []);

    useEffect(() => {
        if (ws) {
            (ws as WebSocket).onmessage = (event: MessageEvent) => {
                const message: { type: string, payload: any } = JSON.parse(event.data);
                switch (message.type) {
                    case 'setAnimation':
                        dispatch(setAnimation(message.payload));
                        break;
                    case 'updateCurrentLayer':
                        dispatch(updateCurrentLayer(message.payload));
                        break;
                    case 'updateScrubberPosition':
                        dispatch(updateScrubberPosition(message.payload));
                        break;
                    case 'updateLayerProperty':
                        dispatch(updateLayerProperty(message.payload));
                        break;
                    case 'removeLayer':
                        dispatch(removeLayer(message.payload));
                        break;
                    case 'updateKeyframeValue':
                        dispatch(updateKeyframeValue(message.payload));
                        break;
                    case 'layerAdded':
                        dispatch(addLayer(message.payload));
                        break;
                    case 'layerDeleted':
                        dispatch(removeLayer(message.payload.layerIndex));
                        break;
                    case 'layerReordered':
                        dispatch(reorderLayers(message.payload));
                        break;
                    case 'propertyChange':
                        dispatch(updateLayerProperty(message.payload));
                        break;
                    default:
                        console.error('Unknown message type:', message.type);
                }
            };
        }
    }, [ws, dispatch]);


    return (
        <div className="editor-container">
            <FileUpload />
            <ApiFetchLoader />
            {currentAnimation && (
                <>
                    <div className="dividing-line my-6 px-2 border-t-2 border-slate-200 border-dashed"></div>
                    <div className="animation-name flex gap-8 p-2 text-2xl font-bold">
                        <h1 className="inline-block">
                            <span className="text-sm font-normal">Name:</span> {currentAnimation.nm || animationName}
                        </h1>
                    </div>
                    <div className="editor-workspace">
                        <div className="canvas-wrapper flex p-2">
                            <AnimationCanvas timelineContentRef={timelineContentRef} />
                            {selectedLayerIndex !== null ? (
                                <div className=''>
                                    <PropertiesPanel />
                                </div>
                            ) : (
                                    <div className="properties-header p-4 ml-4 border border-slate-300 rounded-lg">
                                        Select a layer to view its properties. <br />Drag the red scrubber to view animation.
                                    </div>
                            )}
                        </div>
                        <Timeline 
                            timelineContentRef={timelineContentRef} 
                            onLayerClick={handleLayerClick} 
                            selectedLayerIndex={selectedLayerIndex} 
                            setSelectedLayerIndex={setSelectedLayerIndex} 
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default Editor;
function addLayer(payload: any): any {
    throw new Error('Function not implemented.');
}

function reorderLayers(payload: any): any {
    throw new Error('Function not implemented.');
}

