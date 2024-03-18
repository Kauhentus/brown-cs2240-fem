import { V3 } from "../geo/atom_vertex";

export type MeshData = {
    vertices: V3[];
    indices: number[][];
}

export const parse_mesh = (obj_data: string): MeshData => {
    // first parse the obj data
    const raw_mesh_lines = obj_data.split('\n');
    const object_groups = {
        vertices: [] as number[],
        indices: [] as number[][]
    };

    for(let raw_line of raw_mesh_lines){
        let line = raw_line.replace(/\s+/g, ' ').replace(/#.*$/, '').trim();
        if(line.length === 0) continue;
        if(line[0] === '#') continue;

        else if(line.slice(0, 2) === 'v '){
            let data = line.slice(2).trim().split(' ').map(parseFloat);
            object_groups.vertices.push(...data.slice(0, 3));
        }

        else if(line.slice(0, 2) === 't '){
            let raw_indices = line.slice(2).trim().split(' ').map(n => parseInt(n));
            object_groups.indices.push(raw_indices)
        }
    }

    const indices = object_groups.indices;
    const vertices: V3[] = [];

    for(let i = 0; i < object_groups.vertices.length; i += 3){
        vertices.push(new V3(
            object_groups.vertices[i],
            object_groups.vertices[i + 1],
            object_groups.vertices[i + 2]
        ));
    }
    const final_result: MeshData = {
        indices: indices,
        vertices: vertices
    }

    return final_result;
}