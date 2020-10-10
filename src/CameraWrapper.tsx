import React, { useState, useEffect } from "react";
import { Spin,Row, Col } from "antd";
import "./index.css";
import { CameraRTSPUrl } from "./Util";
import { LoadingOutlined } from '@ant-design/icons';
/*
>>
> Camera URL
`http://${window.location.hostname}:8081/camera_1`
`http://${window.location.hostname}:8081/camera_2`
`http://${window.location.hostname}:8081/camera_3`
    ...

 */

interface ICamera {
  CameraURL: string;
  height: string;
}

function Camera({  CameraURL,height }: ICamera) {
  // Spinner & Auto Reload
  const [Spinning, SetSpinning] = useState<boolean>(true);
  return (
    <Spin tip="Camera Loading" spinning={Spinning} style={{color:"#607D8B"}} indicator={<LoadingOutlined style={{ fontSize: 24,color:'#607D8B'}} spin />}>
      <div style={{height,background:'#607D8B' }}>
        <img
          width="100%"
          height="100%"
          onLoad={() => SetSpinning(false)} // 로딩 성공 시 Spin 종료
          onError={(e) => {
            // 로딩 실패 시 경로 재설정 (ReLoad)
            e.currentTarget.src = "";
            e.currentTarget.src = CameraURL;
          }}
          src={CameraURL}
        />
      </div>
    </Spin>
  );
}

export default function CameraWrapper() {
  return (
    <div>
      <Row style={{ height: "63vh"}} gutter={16}>
        <Col span={16}>
          <Camera CameraURL={CameraRTSPUrl[0]} height="61.6vh" />
        </Col>
        <Col span={8}>
          <Row  gutter={[16,16]}>
          <Col style={{width:'60vh'}}>
            <Camera CameraURL={CameraRTSPUrl[1]} height="30vh" />
            </Col>
          </Row>
          <Row gutter={[16,16]}>
          <Col style={{width:'60vh'}}>
            <Camera CameraURL={CameraRTSPUrl[2]} height="30vh" />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row style={{ height: "30vh" }} gutter={16}>
        <Col span={8}>
        <Camera CameraURL={CameraRTSPUrl[0]} height="30vh" />
        </Col>
        <Col span={8}>
        <Camera CameraURL={CameraRTSPUrl[2]} height="30vh" />
        </Col>
        <Col span={8}>
        <Camera CameraURL={CameraRTSPUrl[2]} height="30vh" />
        </Col>
      </Row>
    </div>
  );
}
