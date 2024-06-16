import React, { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from "react-redux";
import { DragDropContext, Droppable, Draggable, DragStart, DropResult } from 'react-beautiful-dnd';
import _ from 'lodash';
import { Animation } from '../types';
import { useAppDispatch, useAppSelector } from '../store/store';
import { removeLayer, setAnimation, updateCurrentLayer, updateKeyframeValue, updateScrubberPosition } from '../store/animationSlice';
import { WebSocketContext } from '../WebSocketProvider';

const Timeline: React.FC<{ 
    timelineContentRef: React.MutableRefObject<HTMLDivElement | null>; 
    onLayerClick: (index: number, layer: any) => void; 
    selectedLayerIndex: number | null;
    setSelectedLayerIndex: (index: number | null) => void;
}> = ({ timelineContentRef, onLayerClick, selectedLayerIndex, setSelectedLayerIndex }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [scrubberPosition, setScrubberPosition] = useState(0);
    const [isDroppableReady, setIsDroppableReady] = useState(false);
    const [draggingLayerIndex, setDraggingLayerIndex] = useState<number | null>(null);

    const ws = useContext(WebSocketContext);

    const dispatch = useAppDispatch();
    const currentAnimation = useAppSelector((state) => state.animation.currentAnimation);
    const currentFrame = useAppSelector((state) => state.animation.currentFrame);
    const currentLayer: any = useAppSelector((state) => state.animation.currentLayer);

    const handleOnDragStart = (start: DragStart) => {
        const layerIndex = parseInt(start.draggableId);
        setDraggingLayerIndex(layerIndex);
    };
    const containerRef = useRef<HTMLDivElement>(null);

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(currentAnimation!.layers);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        dispatch(setAnimation(currentAnimation as Animation)); // Update the animation state in Redux
        
        // Update currentLayer after dragging
        if (selectedLayerIndex !== null) {
            dispatch(updateCurrentLayer(items[selectedLayerIndex]));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !timelineContentRef.current) return;

        const timelineRect = timelineContentRef.current?.getBoundingClientRect();
        const newPosition = Math.max(
            0,
            Math.min(timelineRect.width, e.clientX - timelineRect.left)
        );
        setScrubberPosition(newPosition);

        const progress = newPosition / timelineRect.width;
        const currentFrame = Math.floor(progress * currentAnimation!.op); // calculate current frame (froma start from 1 instead of 0)
        dispatch(updateScrubberPosition(currentFrame));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };


    const renderKeyframes = (layer: any) => {
        const ks = layer.ks || null;
        let keyframes: any[] = [];
        for (const key in ks) {
            if (!ks[key]?.k) continue;
            if (!Array.isArray(ks[key]?.k[0]) && typeof ks[key]?.k[0] === "object") {  // check if it is an array of object (has keyframes)
                for (let i = 0; i < ks[key]?.k.length; i++) {
                    keyframes.push(ks[key]?.k[i]);
                }
            }
        }
        
        return (
            <div className="keyframes">
                {keyframes.map((keyframe: any, index: number) => (
                    <Draggable key={index} draggableId={index.toString()} index={index}>
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="keyframe absolute top-1/3 w-2 h-2 -translate-x-2/4 -translate-y-2/4 rounded-full"
                                style={{ left: `${(keyframe?.t / currentAnimation!.op) * 100}%`}}
                            >
                                <div className={`keyframe-dot ${layer.ind === currentLayer?.ind ? "bg-gray-100" : "bg-gray-400"} cursor-default`}></div>
                                {/* <input
                                    type="number"
                                    value={keyframe.s[0]}
                                    onChange={(e) => {
                                        const newValue = parseFloat(e.target.value);
                                        dispatch(
                                            updateKeyframeValue({
                                                layerIndex: layer.ind,
                                                keyframeIndex: index,
                                                newValue,
                                            })
                                        );
                                    }}
                                /> */}
                            </div>
                        )}
                    </Draggable>
                ))}
            </div>
        );
    };

    const handleDeleteLayer = (index: number, e: any,) => {  // index of the array layers[] (start from 0)
        e.stopPropagation();  // prevent the onLayerClick event from firing

        // Reset selectedLayerIndex when a selected layer is deleted
        if (selectedLayerIndex === index) {
            setSelectedLayerIndex(null);
            // dispatch(updateCurrentLayer(null));
        } else if (selectedLayerIndex !== null && selectedLayerIndex > index) {
            // If the selected layer is after the deleted layer, adjust the index
            setSelectedLayerIndex(selectedLayerIndex - 1);
            dispatch(updateCurrentLayer(selectedLayerIndex - 1));
        }
        dispatch(removeLayer(index));

        // Update currentLayer only if a valid layer is selected
        if (selectedLayerIndex !== null && currentAnimation?.layers[selectedLayerIndex]) {
            dispatch(updateCurrentLayer(currentAnimation.layers[selectedLayerIndex]));
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsDroppableReady(true);
        }, 0); // Set isDroppableReady after a short delay to prevent the Droppable from rendering too early
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Update selectedLayerIndex when currentFrame changes
        if (currentAnimation && currentLayer) {
            const layers = currentAnimation.layers;
            for (let i = layers.length - 1; i >= 0; i--) {
                const layer = layers[i];
                if (layer.ip <= (currentFrame as number) && layer.op >= (currentFrame as number)) {
                    setSelectedLayerIndex(i);
                    return; // Exit the loop once a matching layer is found
                }
            }
            setSelectedLayerIndex(null); // No layer found for the current frame
        }
    }, [currentFrame, currentAnimation]);


    useEffect(() => {
        if (currentLayer !== null) {
            console.log("====== Current Layer:", currentAnimation?.layers[(currentLayer.ind as number)]);
        }
    }, [currentLayer]);


    return (
        <DragDropContext onDragEnd={handleOnDragEnd} onDragStart={handleOnDragStart}>
            {isDroppableReady && (<Droppable droppableId="layers" direction="vertical">
                {(provided) => (
                    <div className="timeline-container p-2" ref={containerRef}>
                        {/* ... timeline header ... */}
                        <div className="timeline-header inline-block mr-6 mb-6 text-2xl font-bold text-slate-500">Timeline</div>
                        <div className="current-layer inline-block mr-4 text-lg font-bold">
                            <span className="text-sm font-normal">Current layer:</span> {currentLayer !== null ? `${currentLayer.ind} - ${currentAnimation?.layers[(selectedLayerIndex as number)]?.nm}` : '--'}
                        </div>
                        <div className="current-frame inline-block mr-4 text-lg font-bold">
                            <span className="text-sm font-normal">Current frame:</span> {currentFrame}
                        </div>
                        <div 
                            className="timeline relative"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                            <div ref={timelineContentRef} className="timeline-content relative inline max-h-[300px] overflow-y-auto">
                                {currentAnimation &&
                                    currentAnimation.layers?.map((layer: any, index: number) => (
                                        <Draggable key={layer.ind} draggableId={layer.ind.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    className={`layer relative h-12 mb-1 px-4 py-2 text-xs cursor-default ${
                                                        snapshot.isDragging
                                                        ? "bg-neutral-200" 
                                                        : layer.ind === currentLayer?.ind ? "bg-slate-400 text-white font-bold" : "bg-neutral-100"}`
                                                    }
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => onLayerClick(index, layer)}
                                                >
                                                    <div>{layer.ind} - {layer.nm}</div>
                                                    {currentLayer !== null && renderKeyframes(layer)}
                                                    <div className="absolute top-2 right-4">
                                                        <button onClick={(e) => handleDeleteLayer(index, e)} className="delete-button">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                <div
                                    className="scrubber absolute bg-red-500 w-1 h-full top-0 -ml-0.5 rounded cursor-ew-resize"
                                    style={{ left: `${scrubberPosition}px` }}
                                    onMouseDown={handleMouseDown}
                                >
                                    {(currentAnimation?.layers?.length as number) > 0 && 
                                    <div className="relative flex justify-center w-10 -translate-x-[18px] -translate-y-full rounded-full">
                                        <div className="text-red-500 font-bold">{currentFrame || 0}</div>
                                    </div>}
                                </div>
                                {provided.placeholder}
                            </div>
                        </div>
                    </div>
                )}
            </Droppable>)}
        </DragDropContext>
    );
};

export default Timeline;

