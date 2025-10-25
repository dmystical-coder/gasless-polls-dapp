declare module "react-jazzicon" {
    import { FC } from "react";
    const jsNumberForAddress: (address: string) => number;
    interface JazziconProps {
        diameter: number;
        seed: number;
        address?: string;
    }
    const Jazzicon: FC<JazziconProps>;
    export default Jazzicon;
    export { jsNumberForAddress };
}

