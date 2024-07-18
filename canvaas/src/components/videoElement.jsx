import React, { useEffect, useRef, useState } from "react";

import { Layer, Rect, Stage, Transformer } from "react-konva";

import samplevid from "../assets/cat.mp4";

import * as cocoSsd from "@tensorflow-models/coco-ssd";

import "@tensorflow/tfjs";
import '../components/videoComponent.css'

const VideoWithBoundingBox = () => {
  // reference to video element
  const videoRef = useRef(null);

  // reference to stage set for bounding box
  const stageRef = useRef(null);

  // reference to custom bounding box selected by user
  const rectRef = useRef(null);

  // dimensions of parent div element
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

  // location of prediction
  const [objectDescription, setObjectDescription] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  // interval between each ml model call
  const [detectionInterval, setDetectionInterval] = useState([]);


  const [createBbox, setCreateBbox] = useState(false);

  // predicions data coming from tensorflow model
  const [predictions, setPredictions] = useState([]);

  // bounding box center
  const [boxCenter, setBoxCenter] = useState({
    xBboxCenter: 75,

    yBboxCenter: 75,
  });

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);


  // least diff between bounding box center an object, to find out about the object wheich user selected.
  const [leastDiff, setLeastDiff] = useState({ distance: 10000, index: null, type: null });


  const [rectProps, setRectProps] = useState({
    x: 50,

    y: 50,

    width: 100,

    height: 100,

    stroke: "red",

    strokeWidth: 2,

    draggable: true,
  });

  // console.log("pre", predictions)

  // setting dimensions when the video loads up.
  const updateDimensions = () => {
    if (videoRef.current) {
      const { offsetWidth: width, offsetHeight: height } = videoRef.current;

      setDimensions({ width, height });
    }
  };

  //  function to call tensor flow model and then pushing the results to predictions state
  const predictObject = async () => {
    if (videoRef.current) {
      const model = await cocoSsd.load();

      const predictionsModel = await model.detect(videoRef.current);

      console.log(
        `predictionsModel`,
        predictionsModel,
        videoRef?.current?.currentTime
      );

      setPredictions((prev) => [
        ...prev,
        [...predictionsModel, { timeStamp: videoRef?.current?.currentTime }],
      ]);
    }
  };
  console.log("predictions", predictions)
   
// matching the prediction object with the selection
  useEffect(() => {
    const matchedobject = predictions?.[predictions?.length - 1]?.filter((each, index) => each?.class == leastDiff?.type || index == leastDiff?.index)
    // console.log(matchedobject, "matchobject")
    // const tempObj = predictions?.map((each) => each?.[leastDiff?.index]?.bbox);

    // const temp2Obj = tempObj[tempObj?.length - 1];
    setObjectDescription({
      left: matchedobject?.[0]?.bbox?.[0],
      top: matchedobject?.[0]?.bbox?.[1],
      width: matchedobject?.[0]?.bbox?.[2],
      height: matchedobject?.[0]?.bbox?.[3],
    });
    // console.log(objectDescription, "Temp Objecct dispplay");
    // console.log("predictionsModel 1", predictions, videoRef);
  }, [predictions]);

  useEffect(() => {
    window.addEventListener("resize", updateDimensions);

    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // console.log("ended", videoRef.current?.ended)

  useEffect(() => {
    const handlePlayPause = () => {
      if (videoRef.current?.paused) {
        clearInterval(detectionInterval);

        setDetectionInterval(null);

        setIsVideoPlaying(false);
      } else if (videoRef.current?.ended) {
        setIsVideoPlaying(false);

        clearInterval(detectionInterval);

        setDetectionInterval(null);

        // setDetectionInterval(setInterval(predictObject, 15000));
      } else {
        setIsVideoPlaying(true);

        setDetectionInterval(setInterval(predictObject, 1000));
      }
    };

    videoRef.current.addEventListener("play", handlePlayPause);

    videoRef.current.addEventListener("pause", handlePlayPause);

    return () => {
      videoRef.current.removeEventListener("play", handlePlayPause);

      videoRef.current.removeEventListener("pause", handlePlayPause);
    };
  }, [isVideoPlaying]);

  // useEffect(() => {

  //     if (!videoRef.current.paused) {

  //         setDetectionInterval(setInterval(predictObject, 500));

  //     } else {

  //         clearInterval(detectionInterval);

  //         setDetectionInterval(null);

  //     }

  //     return () => clearInterval(detectionInterval);

  // }, []);

  // handle resizing and dragging  selection box

  const handleTransformEnd = () => {
    const node = rectRef.current;

    const scaleX = node.scaleX();

    const scaleY = node.scaleY();

    // Reset scale to 1

    node.scaleX(1);

    node.scaleY(1);

    setRectProps({
      ...rectProps,

      x: node.x(),

      y: node.y(),

      width: node.width() * scaleX,

      height: node.height() * scaleY,
    });

    setBoxCenter({
      xBboxCenter: node.x() + (node.width() * scaleX) / 2,

      yBboxCenter: node.y() + (node.height() * scaleY) / 2,
    });

    // console.log({

    //     x: node.x(),

    //     y: node.y(),

    //     width: node.width() * scaleX,

    //     height: node.height() * scaleY,

    // });
  };

  const handleDragEnd = () => {
    const node = rectRef.current;

    const scaleX = node.scaleX();

    const scaleY = node.scaleY();

    setRectProps({
      ...rectProps,

      x: node.x(),

      y: node.y(),
    });

    setBoxCenter({
      xBboxCenter: node.x() + (node.width() * scaleX) / 2,

      yBboxCenter: node.y() + (node.height() * scaleY) / 2,
    });

    // console.log({

    //     x: node.x(),

    //     y: node.y(),

    //     width: node.width(),

    //     height: node.height(),

    // });
  };


  // setting selection box state true whenever we wish to create one.
  function handleCreateBoundingBox() {
    setCreateBbox(true);
    videoRef.current?.pause()
  }

  function handleBoundingBoxSubmit() {
    const takeIndex =
      Math.floor(videoRef?.current?.currentTime) > 1
        ? Math.floor(videoRef?.current?.currentTime) - 1
        : 0;

    predictions[takeIndex]?.map((item, index) => {
      const itemCenter = {
        xBboxCenter: item?.bbox?.[0] + item?.bbox?.[2] / 2,

        yBboxCenter: item?.bbox?.[1] + item?.bbox?.[3] / 2,
      };
      // console.log(itemCenter, "Center got");

      const distance = Math.sqrt(
        Math.pow(boxCenter?.xBboxCenter - itemCenter?.xBboxCenter, 2) +
        Math.pow(boxCenter?.yBboxCenter - itemCenter?.yBboxCenter, 2)
      );

      if (distance < leastDiff?.distance) {
        setLeastDiff({ distance: distance, index: index, type: item?.class });
      }
    });
    setCreateBbox(false)
    videoRef.current?.play()
  }
  // console.log(videoRef?.current?.currentTime,"Videoref ");


  // console.log("leastDiff", leastDiff);

  function handleClearBlur() {
    setObjectDescription({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    })
    setLeastDiff({ distance: 10000, index: null, type: null })
  }

  return (
    <div style={{ display: "flex" }}>
      <div className="video-controls">
        <button onClick={() => videoRef.current.play()}>Play</button>
        <button onClick={() => videoRef.current.pause()}>Pause</button>
        {predictions?.length > 0 && !createBbox && <button onClick={handleCreateBoundingBox}>Create bounding box</button>}
        {createBbox && <button onClick={() => { setCreateBbox(false); videoRef.current?.pause() }}>Clear bounding box</button>}
        {predictions?.length > 0 && leastDiff.index === null && createBbox && <button onClick={handleBoundingBoxSubmit}>Submit and blur</button>}
        {predictions?.length > 0 && leastDiff.index !== null && <button onClick={handleClearBlur}>Clear blur</button>}
      </div>

      <div style={{ position: "relative", width: "1280px", height: "720px" }}>
        <div
          style={{
            position: "absolute",
            top: `${objectDescription?.top}px`,
            left: `${objectDescription?.left}px`,
            height: `${objectDescription?.height}px`,
            width: `${objectDescription?.width}px`,
            // color: "black",
            // filter: "",
            backdropFilter: "blur(15px)",
            // backgroundColor: "black",
          }}
        />

        <video
          ref={videoRef}
          src={samplevid}
          controls
          controlsList="nodownload"
          disablePictureInPicture
          style={{ width: "100%", height: "100%" }}
        />

        {createBbox && (
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Layer>
              <Rect
                {...rectProps}
                ref={rectRef}
                onTransformEnd={handleTransformEnd}
                onDragEnd={handleDragEnd}
              />

              <Transformer
                ref={(tr) => {
                  tr && tr.nodes([stageRef.current.findOne("Rect")]);
                }}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize

                  if (newBox.width < 30 || newBox.height < 30) {
                    return oldBox;
                  }

                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
};

export default VideoWithBoundingBox;