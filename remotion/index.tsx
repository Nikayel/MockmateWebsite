import { Composition, registerRoot } from "remotion"
import { ProductDemo } from "./ProductDemo"

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProductDemo"
        component={ProductDemo}
        durationInFrames={1350} // 45 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}

registerRoot(RemotionRoot)
