import { FlowDB } from '../flowDb.js';
import flow from './flowParser.ts';
import { cleanupComments } from '../../../diagram-api/comments.js';
import { setConfig } from '../../../config.js';

setConfig({
  securityLevel: 'strict',
});

describe('parsing a flow chart', function () {
  beforeEach(function () {
    flow.parser.yy = new FlowDB();
    flow.parser.yy.clear();
  });

  it('should handle a trailing whitespaces after statements', function () {
    const res = flow.parser.parse(cleanupComments('graph TD;\n\n\n %% Comment\n A-->B; \n B-->C;'));

    const vert = flow.parser.yy.getVertices();
    const edges = flow.parser.yy.getEdges();

    expect(vert.get('A').id).toBe('A');
    expect(vert.get('B').id).toBe('B');
    expect(edges.length).toBe(2);
    expect(edges[0].start).toBe('A');
    expect(edges[0].end).toBe('B');
    expect(edges[0].type).toBe('arrow_point');
    expect(edges[0].text).toBe('');
  });

  it('should handle node names with "end" substring', function () {
    const res = flow.parser.parse('graph TD\nendpoint --> sender');

    const vert = flow.parser.yy.getVertices();
    const edges = flow.parser.yy.getEdges();

    expect(vert.get('endpoint').id).toBe('endpoint');
    expect(vert.get('sender').id).toBe('sender');
    expect(edges[0].start).toBe('endpoint');
    expect(edges[0].end).toBe('sender');
  });

  it('should handle node names ending with keywords', function () {
    const res = flow.parser.parse('graph TD\nblend --> monograph');

    const vert = flow.parser.yy.getVertices();
    const edges = flow.parser.yy.getEdges();

    expect(vert.get('blend').id).toBe('blend');
    expect(vert.get('monograph').id).toBe('monograph');
    expect(edges[0].start).toBe('blend');
    expect(edges[0].end).toBe('monograph');
  });

  it('should allow default in the node name/id', function () {
    const res = flow.parser.parse('graph TD\ndefault --> monograph');

    const vert = flow.parser.yy.getVertices();
    const edges = flow.parser.yy.getEdges();

    expect(vert.get('default').id).toBe('default');
    expect(vert.get('monograph').id).toBe('monograph');
    expect(edges[0].start).toBe('default');
    expect(edges[0].end).toBe('monograph');
  });

  describe('special characters should be handled.', function () {
    const charTest = function (char, result) {
      const res = flow.parser.parse('graph TD;A(' + char + ')-->B;');

      const vert = flow.parser.yy.getVertices();
      const edges = flow.parser.yy.getEdges();

      expect(vert.get('A').id).toBe('A');
      expect(vert.get('B').id).toBe('B');
      if (result) {
        expect(vert.get('A').text).toBe(result);
      } else {
        expect(vert.get('A').text).toBe(char);
      }
      flow.parser.yy.clear();
    };

    it("should be able to parse a '.'", function () {
      charTest('.');
      charTest('Start 103a.a1');
    });

    // it('should be able to parse text containing \'_\'', function () {
    //   charTest('_')
    // })

    it("should be able to parse a ':'", function () {
      charTest(':');
    });

    it("should be able to parse a ','", function () {
      charTest(',');
    });

    it("should be able to parse text containing '-'", function () {
      charTest('a-b');
    });

    it("should be able to parse a '+'", function () {
      charTest('+');
    });

    it("should be able to parse a '*'", function () {
      charTest('*');
    });

    it("should be able to parse a '<'", function () {
      charTest('<', '&lt;');
    });

    // it("should be able to parse a '>'", function() {
    //   charTest('>', '&gt;');
    // });

    // it("should be able to parse a '='", function() {
    //   charTest('=', '&equals;');
    // });
    it("should be able to parse a '&'", function () {
      charTest('&');
    });
  });

  it('should be possible to use direction in node ids', function () {
    let statement = '';

    statement = statement + 'graph TD;' + '\n';
    statement = statement + '  node1TB\n';

    const res = flow.parser.parse(statement);
    const vertices = flow.parser.yy.getVertices();
    const classes = flow.parser.yy.getClasses();
    expect(vertices.get('node1TB').id).toBe('node1TB');
  });

  it('should be possible to use direction in node ids', function () {
    let statement = '';

    statement = statement + 'graph TD;A--x|text including URL space|B;';
    const res = flow.parser.parse(statement);
    const vertices = flow.parser.yy.getVertices();
    const classes = flow.parser.yy.getClasses();
    expect(vertices.get('A').id).toBe('A');
  });

  it('should be possible to use numbers as labels', function () {
    let statement = '';

    statement = statement + 'graph TB;subgraph "number as labels";1;end;';
    const res = flow.parser.parse(statement);
    const vertices = flow.parser.yy.getVertices();

    expect(vertices.get('1').id).toBe('1');
  });

  it('should add accTitle and accDescr to flow chart', function () {
    const flowChart = `graph LR
      accTitle: Big decisions
      accDescr: Flow chart of the decision making process
      A[Hard] -->|Text| B(Round)
      B --> C{Decision}
      C -->|One| D[Result 1]
      C -->|Two| E[Result 2]
      `;

    flow.parser.parse(flowChart);
    expect(flow.parser.yy.getAccTitle()).toBe('Big decisions');
    expect(flow.parser.yy.getAccDescription()).toBe('Flow chart of the decision making process');
  });
  it('should add accTitle and a multi line accDescr to flow chart', function () {
    const flowChart = `graph LR
      accTitle: Big decisions

      accDescr {
        Flow chart of the decision making process
        with a second line
      }

      A[Hard] -->|Text| B(Round)
      B --> C{Decision}
      C -->|One| D[Result 1]
      C -->|Two| E[Result 2]
`;

    flow.parser.parse(flowChart);
    expect(flow.parser.yy.getAccTitle()).toBe('Big decisions');
    expect(flow.parser.yy.getAccDescription()).toBe(
      `Flow chart of the decision making process
with a second line`
    );
  });

  for (const unsafeProp of ['__proto__', 'constructor']) {
    it(`should work with node id ${unsafeProp}`, function () {
      const flowChart = `graph LR
      ${unsafeProp} --> A;`;

      expect(() => {
        flow.parser.parse(flowChart);
      }).not.toThrow();
    });

    it(`should work with tooltip id ${unsafeProp}`, function () {
      const flowChart = `graph LR
      click ${unsafeProp} callback "${unsafeProp}";`;

      expect(() => {
        flow.parser.parse(flowChart);
      }).not.toThrow();
    });

    it(`should work with class id ${unsafeProp}`, function () {
      const flowChart = `graph LR
      ${unsafeProp} --> A;
      classDef ${unsafeProp} color:#ffffff,fill:#000000;
      class ${unsafeProp} ${unsafeProp};`;

      expect(() => {
        flow.parser.parse(flowChart);
      }).not.toThrow();
    });

    it(`should work with subgraph id ${unsafeProp}`, function () {
      const flowChart = `graph LR
      ${unsafeProp} --> A;
      subgraph ${unsafeProp}
        C --> D;
      end;`;

      expect(() => {
        flow.parser.parse(flowChart);
      }).not.toThrow();
    });
  }
});
