import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ANIMATION } from '../graphql/queries';
import client from '../graphql/apolloClient';
import { useAppDispatch } from '../store/store';
import { selectLayer, setAnimation, setAnimationID, setAnimationName, updateCurrentLayer, updateLoadThrough, updateScrubberPosition } from '../store/animationSlice';

const ApiFetchLoader: React.FC = () => {
    const [animationJsonData, setAnimationJsonData] = useState<any | null>(null);
    const [publicAnimationID, setPublicAnimationID] = useState<string>("");  // the ID of the public animation
    const [publicAnimationName, setPublicAnimationName] = useState<string>("");  // the name of the public animation
    const [fileId, setFileId] = useState<number | null>(null);
    const [loadingJsonDataError, setLoadingJsonDataError] = useState<string | null>(null);
    const dispatch = useAppDispatch();

    const { loading, error, data } = useQuery(GET_ANIMATION, {
        variables: { id: fileId },
        client: client,
    });

    useEffect(() => {
        const loadPublicAnimationData = async () => {
            if (data && data.publicAnimation) {
                const loadAnimationFromServer = async () => {
                    const response = await fetch(data.publicAnimation.jsonUrl);
                    if (!response.ok) {
                        setLoadingJsonDataError(`Failed to fetch animation data from server: ${response.statusText}`);
                    }
                    const animationData = await response.json();
                    setAnimationJsonData(animationData);
                    setPublicAnimationID(data.publicAnimation.id);
                    setPublicAnimationName(data.publicAnimation.name);
                }
                loadAnimationFromServer();
            }
        };
    
        if (data && data.publicAnimation) {
            loadPublicAnimationData(); 
            console.log("|||| publicAnimation data loaded:", data.publicAnimation);   
        }
    }, [data, dispatch]);


    const handleIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const id = parseInt(event.target.value);
        if (!isNaN(id)) {
            setFileId(id);
        } else {
            setFileId(null);
        }
    };

    const handleAPIFetch = async () => {
        console.log("Fetching animation with ID:", fileId);
        console.log("JSON data loaded:", animationJsonData);
        if (animationJsonData) {
            dispatch(setAnimationID(publicAnimationID));
            dispatch(setAnimationName(publicAnimationName));
            dispatch(setAnimation(animationJsonData));
            dispatch(updateLoadThrough("API"));
            dispatch(selectLayer(null));
            dispatch(updateCurrentLayer(null));
            dispatch(updateScrubberPosition(0));
        }
    }


    return (
        <>
            <div className="api-fetch-container flex my-2">
                <div className="mt-1 mr-2">{`Or, you may fetch the animation JSON by ID (e.g 25, 43, 2615): `}</div>
                <div className="flex-5">
                    <input className="px-2 py-1.5 mr-4 text-sm" type="number" accept=".json" onChange={handleIdChange} />
                </div>
                {fileId && <div className="flex-1 content-center">
                    {loading 
                        ? <div className="flex px-6 py-1">Loading...</div>
                        : animationJsonData 
                            ? <button className="px-2 py-1 text-sm border border-slate-400 rounded-lg" onClick={handleAPIFetch}>Fetch animation</button> 
                            : <div className="flex px-2 py-1 text-red-500">No JSON data found</div>
                    }
                </div>}
            </div>
            {fileId 
                ? error && <div className="flex px-6 py-4 text-red-500">Error: {error.message}</div>
                : loadingJsonDataError && <div className="flex px-6 py-4 text-red-500">{loadingJsonDataError}</div>
            }
        </>
    );
};

export default ApiFetchLoader;
